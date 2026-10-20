package com.trademind;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableCaching
@EnableScheduling
public class TradeMindApplication {
    public static void main(String[] args) {
        SpringApplication.run(TradeMindApplication.class, args);
    }
}


// ============================================================
//  security/JwtUtil.java  — JWT Token Generator & Validator
// ============================================================
