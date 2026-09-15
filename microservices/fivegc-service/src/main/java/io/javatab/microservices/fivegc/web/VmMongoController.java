package io.javatab.microservices.fivegc.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/vm/mongo")
@Tag(name = "VM MongoDB", description = "MongoDB console — browse databases, collections, documents")
public class VmMongoController {

    private static final Logger log = LoggerFactory.getLogger(VmMongoController.class);
    private static final Set<String> SYSTEM_DBS = Set.of("local");

    private final MongoClient mongo;
    private final ObjectMapper mapper;

    public VmMongoController(MongoClient mongo, ObjectMapper mapper) {
        this.mongo  = mongo;
        this.mapper = mapper;
    }

    // ── list databases ────────────────────────────────────────────────────────

    @Operation(summary = "List databases", security = @SecurityRequirement(name = "bearerAuth"))
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/dbs")
    public List<Map<String, Object>> listDbs() {
        List<Map<String, Object>> result = new ArrayList<>();
        mongo.listDatabases().into(new ArrayList<>()).forEach(d -> {
            String name = d.getString("name");
            if (SYSTEM_DBS.contains(name)) return;
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("name", name);
            entry.put("sizeOnDisk", d.get("sizeOnDisk"));
            result.add(entry);
        });
        result.sort(Comparator.comparing(m -> (String) m.get("name")));
        return result;
    }

    // ── list collections ──────────────────────────────────────────────────────

    @Operation(summary = "List collections in a database", security = @SecurityRequirement(name = "bearerAuth"))
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{db}/collections")
    public List<Map<String, Object>> listCollections(@PathVariable String db) {
        MongoDatabase database = mongo.getDatabase(db);
        List<Map<String, Object>> result = new ArrayList<>();
        database.listCollections().into(new ArrayList<>()).forEach(info -> {
            String name = info.getString("name");
            long count;
            try { count = database.getCollection(name).estimatedDocumentCount(); }
            catch (Exception e) { count = -1; }
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("name", name);
            entry.put("count", count);
            result.add(entry);
        });
        result.sort(Comparator.comparing(m -> (String) m.get("name")));
        return result;
    }

    // ── browse documents ──────────────────────────────────────────────────────

    @Operation(summary = "Browse documents (paginated)", security = @SecurityRequirement(name = "bearerAuth"))
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{db}/{col}/documents")
    public Map<String, Object> browse(
            @PathVariable String db,
            @PathVariable String col,
            @RequestParam(required = false) String filter,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0")  int skip) {
        return query(db, col, filter, limit, skip);
    }

    // ── run custom query ──────────────────────────────────────────────────────

    @Operation(summary = "Run a custom find query", security = @SecurityRequirement(name = "bearerAuth"))
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/{db}/{col}/query")
    public Map<String, Object> runQuery(
            @PathVariable String db,
            @PathVariable String col,
            @RequestBody Map<String, Object> body) {
        String filterJson = "{}";
        try {
            if (body.containsKey("filter"))
                filterJson = mapper.writeValueAsString(body.get("filter"));
        } catch (Exception e) { /* use {} */ }
        int limit = body.containsKey("limit") ? ((Number) body.get("limit")).intValue() : 20;
        int skip  = body.containsKey("skip")  ? ((Number) body.get("skip")).intValue()  : 0;
        return query(db, col, filterJson, limit, skip);
    }

    // ── insert document ───────────────────────────────────────────────────────

    @Operation(summary = "Insert a document", security = @SecurityRequirement(name = "bearerAuth"))
    @PreAuthorize("hasRole('NETWORK_OPERATOR') or hasRole('PLATFORM_ADMIN')")
    @PostMapping("/{db}/{col}")
    public ResponseEntity<Map<String, Object>> insert(
            @PathVariable String db,
            @PathVariable String col,
            @RequestBody String bodyJson) {
        try {
            Document doc = Document.parse(bodyJson);
            mongo.getDatabase(db).getCollection(col).insertOne(doc);
            String id = doc.getObjectId("_id") != null
                    ? doc.getObjectId("_id").toHexString()
                    : String.valueOf(doc.get("_id"));
            log.info("Inserted document into {}.{} id={}", db, col, id);
            return ResponseEntity.ok(Map.of("insertedId", id));
        } catch (Exception e) {
            log.warn("Insert failed {}.{}: {}", db, col, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── delete document ───────────────────────────────────────────────────────

    @Operation(summary = "Delete a document by _id", security = @SecurityRequirement(name = "bearerAuth"))
    @PreAuthorize("hasRole('NETWORK_OPERATOR') or hasRole('PLATFORM_ADMIN')")
    @DeleteMapping("/{db}/{col}/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String db,
            @PathVariable String col,
            @PathVariable String id) {
        MongoCollection<Document> collection = mongo.getDatabase(db).getCollection(col);
        org.bson.conversions.Bson filterDoc;
        try {
            filterDoc = Filters.eq("_id", new ObjectId(id));
        } catch (Exception e) {
            filterDoc = Filters.eq("_id", id);
        }
        collection.deleteOne(filterDoc);
        log.info("Deleted document from {}.{} id={}", db, col, id);
        return ResponseEntity.noContent().build();
    }

    // ── server stats ──────────────────────────────────────────────────────────

    @Operation(summary = "MongoDB server stats", security = @SecurityRequirement(name = "bearerAuth"))
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/stats")
    public Map<String, Object> stats() {
        try {
            Document info = mongo.getDatabase("admin").runCommand(new Document("buildInfo", 1));
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("version",   info.getString("version"));
            result.put("ok",        true);
            result.put("databases", countDbs());
            return result;
        } catch (Exception e) {
            return Map.of("ok", false, "error", e.getMessage());
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Map<String, Object> query(String db, String col, String filterJson, int limit, int skip) {
        MongoCollection<Document> collection = mongo.getDatabase(db).getCollection(col);
        Document filterDoc = (filterJson != null && !filterJson.isBlank())
                ? Document.parse(filterJson) : new Document();
        long total = collection.countDocuments(filterDoc);
        List<String> docs = new ArrayList<>();
        collection.find(filterDoc).skip(skip).limit(Math.min(limit, 100))
                .into(new ArrayList<>()).forEach(d -> docs.add(d.toJson()));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("documents", docs);
        result.put("total",     total);
        result.put("skip",      skip);
        result.put("limit",     limit);
        return result;
    }

    private long countDbs() {
        long count = 0;
        for (String name : mongo.listDatabaseNames()) {
            if (!SYSTEM_DBS.contains(name)) count++;
        }
        return count;
    }
}
