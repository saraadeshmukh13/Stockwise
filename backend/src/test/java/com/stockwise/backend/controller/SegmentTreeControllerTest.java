package com.stockwise.backend.controller;

import com.stockwise.backend.entity.Product;
import com.stockwise.backend.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SegmentTreeControllerTest {
    @Test
    void sumsCurrentQuantitiesInProductIdOrderAndIncludesBothIndexes() {
        ProductRepository repository = mock(ProductRepository.class);
        Product first = product(8L, 12);
        Product second = product(2L, 5);
        when(repository.findAll(Sort.by(Sort.Direction.ASC, "id"))).thenReturn(List.of(second, first));

        Map<String, Object> result = new SegmentTreeController(repository).getRangeSum(0, 1);

        verify(repository).findAll(Sort.by(Sort.Direction.ASC, "id"));
        assertEquals(0, result.get("startIndex"));
        assertEquals(1, result.get("endIndex"));
        assertEquals(17L, result.get("totalStock"));
    }

    @Test
    void mapsInvalidIndexRangeToBadRequest() {
        ProductRepository repository = mock(ProductRepository.class);
        when(repository.findAll(Sort.by(Sort.Direction.ASC, "id"))).thenReturn(List.of(product(1L, 2)));
        IllegalArgumentException invalid = assertThrows(IllegalArgumentException.class,
                () -> new SegmentTreeController(repository).getRangeSum(0, 1));

        var response = new ApiExceptionHandler().invalidArgument(invalid);
        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        assertEquals("Invalid product range", response.getDetail());
    }

    private Product product(long id, int quantity) {
        Product product = new Product();
        product.setId(id);
        product.setQuantity(quantity);
        return product;
    }
}
