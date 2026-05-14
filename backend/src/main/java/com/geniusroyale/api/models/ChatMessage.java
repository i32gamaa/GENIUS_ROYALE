package com.geniusroyale.api.models;

import jakarta.persistence.*;

@Entity
@Table(name = "Mensaje_Chat")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String sender;

    @Column(nullable = false)
    private String receiver;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(nullable = false)
    private Long timestamp;

    @Column(nullable = false)
    private Boolean isRead = false;

    private String tempId; // Referencia temporal para el frontend

    public ChatMessage() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }
    public String getReceiver() { return receiver; }
    public void setReceiver(String receiver) { this.receiver = receiver; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Long getTimestamp() { return timestamp; }
    public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }
    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }
    public String getTempId() { return tempId; }
    public void setTempId(String tempId) { this.tempId = tempId; }
} 