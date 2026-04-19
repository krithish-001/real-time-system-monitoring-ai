package com.ai.monitoring.controller;

import com.ai.monitoring.service.SseService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api")
public class DashboardController {

    private final SseService sseService;

    public DashboardController(SseService sseService) {
        this.sseService = sseService;
    }

    // Main endpoint that the React app hooks into when the page boots
    @GetMapping(value = "/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMetrics() {
        // By default spring restricts timeout, 0L or -1L sets to infinity
        SseEmitter emitter = new SseEmitter(0L); 
        sseService.addEmitter(emitter);
        return emitter;
    }
}
