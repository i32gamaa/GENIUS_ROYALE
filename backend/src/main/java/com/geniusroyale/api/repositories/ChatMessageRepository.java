package com.geniusroyale.api.repositories;

import com.geniusroyale.api.models.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Integer> {
    
    // 🔥 NUEVO: Solo carga los mensajes que NO han sido borrados por este usuario
    @Query("SELECT m FROM ChatMessage m WHERE (m.sender = :me AND m.receiver = :amigo AND m.deletedBySender = false) OR (m.sender = :amigo AND m.receiver = :me AND m.deletedByReceiver = false) ORDER BY m.timestamp ASC")
    List<ChatMessage> findChatHistoryForUser(@Param("me") String me, @Param("amigo") String amigo);

    @Modifying
    @Transactional
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.sender = :sender AND m.receiver = :receiver AND m.isRead = false")
    void markAsRead(@Param("sender") String sender, @Param("receiver") String receiver);

    // 🔥 NUEVO: Ocultar los mensajes que yo envié
    @Modifying
    @Transactional
    @Query("UPDATE ChatMessage m SET m.deletedBySender = true WHERE m.sender = :me AND m.receiver = :amigo")
    void clearMySentMessages(@Param("me") String me, @Param("amigo") String amigo);

    // 🔥 NUEVO: Ocultar los mensajes que yo recibí
    @Modifying
    @Transactional
    @Query("UPDATE ChatMessage m SET m.deletedByReceiver = true WHERE m.sender = :amigo AND m.receiver = :me")
    void clearMyReceivedMessages(@Param("me") String me, @Param("amigo") String amigo);
}