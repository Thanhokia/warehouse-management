package com.example.backend.common.exception;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFoundException exception) {
        return ResponseEntity.status(404)
                .body(buildResponse(404, exception.getMessage(), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return ResponseEntity.status(400)
                .body(buildResponse(400, "Validation failed", errors));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException exception) {
        // 409 Conflict — dùng khi vi phạm unique constraint (duplicate code, name...)
        return ResponseEntity.status(409)
                .body(buildResponse(409, exception.getMessage(), null));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException exception) {
        // 422 Unprocessable Entity — dùng khi logic nghiệp vụ bị vi phạm (tồn kho thiếu, đơn đã hoàn thành...)
        return ResponseEntity.status(HttpStatusCode.valueOf(422))
                .body(buildResponse(422, exception.getMessage(), null));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException exception) {
        return ResponseEntity.status(403)
                .body(buildResponse(403, "Bạn không có quyền thực hiện thao tác này.", null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception exception) {
        return ResponseEntity.status(500)
                .body(buildResponse(500, "Internal server error: " + exception.getMessage(), null));
    }

    private Map<String, Object> buildResponse(int status, String message, Object errors) {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now());
        response.put("status", status);
        response.put("message", message);
        response.put("errors", errors);
        return response;
    }
}
