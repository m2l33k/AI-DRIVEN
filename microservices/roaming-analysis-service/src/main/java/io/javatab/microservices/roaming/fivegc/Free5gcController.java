package io.javatab.microservices.roaming.fivegc;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Keycloak-gated proxy to the free5GC WebConsole API.
 *
 * All endpoints require PERM_roaming-events:read (SECURITY_ANALYST / AUDITOR).
 * The WebConsole admin credentials are never exposed to the client — they are
 * stored in application.yml and exchanged server-side.
 */
@RestController
@RequestMapping("/api/5gc")
@PreAuthorize("hasAuthority('PERM_roaming-events:read')")
public class Free5gcController {

    private final Free5gcService svc;

    public Free5gcController(Free5gcService svc) {
        this.svc = svc;
    }

    /** Provisioned subscriber list — IMSI + GPSI from UDR/UDM. */
    @GetMapping("/subscribers")
    public List<Map<String, Object>> subscribers() {
        return svc.getSubscribers();
    }

    /** Currently registered UE contexts — active sessions via AMF. */
    @GetMapping("/ue-contexts")
    public List<Map<String, Object>> ueContexts() {
        return svc.getRegisteredUeContexts();
    }

    /** Live NF status: which control-plane NFs are reachable. */
    @GetMapping("/nf-status")
    public List<NfStatusDto> nfStatus() {
        return svc.getNfStatus();
    }
}
