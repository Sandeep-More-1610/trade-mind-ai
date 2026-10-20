package com.trademind.service;

import com.trademind.repository.LeaderboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final LeaderboardRepository leaderboardRepo;

    @Cacheable(value = "leaderboard")
    public List<?> getTop(int limit) {
        return leaderboardRepo.getTopUsers(limit);
    }
}


// ============================================================
//  service/FraudService.java
// ============================================================
