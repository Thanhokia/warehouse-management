package com.example.backend.inventory.service;

import com.example.backend.common.exception.ResourceNotFoundException;
import com.example.backend.inventory.dto.request.InventoryCheckDetailRequest;
import com.example.backend.inventory.dto.request.InventoryCheckRequest;
import com.example.backend.inventory.dto.request.StockAdjustRequest;
import com.example.backend.inventory.dto.response.InventoryCheckDetailResponse;
import com.example.backend.inventory.dto.response.InventoryCheckResponse;
import com.example.backend.inventory.entity.*;
import com.example.backend.inventory.repository.InventoryCheckDetailRepository;
import com.example.backend.inventory.repository.InventoryCheckRepository;
import com.example.backend.inventory.repository.ProductRepository;
import com.example.backend.inventory.repository.StockItemRepository;
import com.example.backend.inventory.repository.UserRepository;
import com.example.backend.inventory.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryCheckService {

    private final InventoryCheckRepository inventoryCheckRepository;
    private final InventoryCheckDetailRepository inventoryCheckDetailRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final StockService stockService;
    private final ActivityLogService activityLogService;
    private final StockItemRepository stockItemRepository;

    @Transactional
    public InventoryCheckResponse createCheck(InventoryCheckRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found"));

        // Generate code KK + yyyyMMddHHmmss
        String code = "KK" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

        InventoryCheck check = InventoryCheck.builder()
                .code(code)
                .warehouse(warehouse)
                .createdBy(user)
                .status(InventoryCheck.CheckStatus.PENDING)
                .checkDate(LocalDateTime.now())
                .note(request.getNote())
                .build();

        InventoryCheck savedCheck = inventoryCheckRepository.save(check);

        List<InventoryCheckDetail> details = new ArrayList<>();
        for (InventoryCheckDetailRequest detailReq : request.getDetails()) {
            Product product = productRepository.findById(detailReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

            BigDecimal originalQuantity = BigDecimal.ZERO;
            var stockOpt = stockItemRepository.findByWarehouseIdAndProductId(warehouse.getId(), product.getId());
            if (stockOpt.isPresent()) {
                originalQuantity = stockOpt.get().getQuantity();
            }

            BigDecimal difference = detailReq.getActualQuantity().subtract(originalQuantity);

            InventoryCheckDetail detail = InventoryCheckDetail.builder()
                    .inventoryCheck(savedCheck)
                    .product(product)
                    .originalQuantity(originalQuantity)
                    .actualQuantity(detailReq.getActualQuantity())
                    .difference(difference)
                    .reason(detailReq.getReason())
                    .build();
            details.add(detail);
        }

        savedCheck.setDetails(details);
        inventoryCheckDetailRepository.saveAll(details);

        activityLogService.logActionWithUser(username, "đã tạo", "Thông tin",
                "phiếu kiểm kê kho: " + code + " tại " + warehouse.getName());

        return toResponse(savedCheck);
    }

    @Transactional
    public InventoryCheckResponse approveCheck(Long id, String username) {
        InventoryCheck check = inventoryCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory Check not found"));

        if (check.getStatus() != InventoryCheck.CheckStatus.PENDING) {
            throw new IllegalStateException("Inventory Check is not pending");
        }

        // Gather all differences != 0
        boolean hasDifference = false;

        for (InventoryCheckDetail detail : check.getDetails()) {
            if (detail.getDifference().compareTo(BigDecimal.ZERO) != 0) {
                hasDifference = true;
                break;
            }
        }

        if (hasDifference) {
            // Apply stock adjustments based on differences to avoid race condition
            stockService.applyInventoryCheckDifferences(check.getDetails(), check.getWarehouse().getId(), username);
            activityLogService.logActionWithUser(username, "đã duyệt", "Thành công",
                    "phiếu kiểm kê: " + check.getCode() + " (Có điều chỉnh chênh lệch)");
        } else {
            activityLogService.logActionWithUser(username, "đã duyệt", "Thành công",
                    "phiếu kiểm kê: " + check.getCode() + " (Số lượng thực tế khớp 100%)");
        }

        check.setStatus(InventoryCheck.CheckStatus.COMPLETED);
        inventoryCheckRepository.save(check);

        return toResponse(check);
    }

    @Transactional
    public InventoryCheckResponse rejectCheck(Long id, String username) {
        InventoryCheck check = inventoryCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory Check not found"));

        if (check.getStatus() != InventoryCheck.CheckStatus.PENDING) {
            throw new IllegalStateException("Inventory Check is not pending");
        }

        check.setStatus(InventoryCheck.CheckStatus.REJECTED);
        inventoryCheckRepository.save(check);

        activityLogService.logActionWithUser(username, "đã từ chối", "Cảnh báo",
                "phiếu kiểm kê: " + check.getCode());

        return toResponse(check);
    }

    public List<InventoryCheckResponse> getAllChecks() {
        return inventoryCheckRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private InventoryCheckResponse toResponse(InventoryCheck check) {
        String createdByName = check.getCreatedBy() != null ? check.getCreatedBy().getFullName() : "N/A";
        String statusStr = "Chờ duyệt";
        if (check.getStatus() == InventoryCheck.CheckStatus.COMPLETED) {
            statusStr = "Đã hoàn thành";
        } else if (check.getStatus() == InventoryCheck.CheckStatus.REJECTED) {
            statusStr = "Đã từ chối";
        }

        List<InventoryCheckDetailResponse> detailResponses = check.getDetails() != null ? check.getDetails().stream()
                .map(d -> InventoryCheckDetailResponse.builder()
                        .id(d.getId())
                        .productId(d.getProduct().getId())
                        .productCode(d.getProduct().getCode())
                        .productName(d.getProduct().getName())
                        .productUnit(d.getProduct().getUnit())
                        .originalQuantity(d.getOriginalQuantity())
                        .actualQuantity(d.getActualQuantity())
                        .difference(d.getDifference())
                        .reason(d.getReason())
                        .build())
                .collect(Collectors.toList()) : new ArrayList<>();

        return InventoryCheckResponse.builder()
                .id(check.getId())
                .code(check.getCode())
                .warehouseId(check.getWarehouse().getId())
                .warehouseName(check.getWarehouse().getName())
                .createdBy(createdByName)
                .status(statusStr)
                .checkDate(check.getCheckDate())
                .note(check.getNote())
                .createdAt(check.getCreatedAt())
                .details(detailResponses)
                .build();
    }
}
