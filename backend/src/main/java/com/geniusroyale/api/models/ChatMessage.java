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

    @Column(nullable = false)
    private String message;

    // 🔥 NUEVO: Columna secreta para que Postgres acepte fotos y audios gigantes
    @Column(name = "contenido_largo", columnDefinition = "TEXT")
    private String contenidoLargo;

    @Column(nullable = false)
    private Long timestamp;

    @Column(nullable = false)
    private Boolean isRead = false;

    private String tempId; 

    @Column(name = "tipo_mensaje")
    private String type = "TEXT"; 

    @Column(name = "borrado_por_emisor")
    private Boolean deletedBySender = false;

    @Column(name = "borrado_por_receptor")
    private Boolean deletedByReceiver = false;

    public ChatMessage() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }
    public String getReceiver() { return receiver; }
    public void setReceiver(String receiver) { this.receiver = receiver; }
    
    // 🔥 MAGIA: Si el mensaje es largo, lo saca de la columna de texto infinito
    public String getMessage() { 
        return (contenidoLargo != null && !contenidoLargo.isEmpty()) ? contenidoLargo : message; 
    }
    
    public void setMessage(String message) { 
        if (message != null && message.length() > 250) {
            this.message = message.substring(0, 250); // Evita crashear el VARCHAR(255)
            this.contenidoLargo = message; // Guarda el audio real aquí
        } else {
            this.message = message;
            this.contenidoLargo = message;
        }
    }

    public Long getTimestamp() { return timestamp; }
    public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }
    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }
    public String getTempId() { return tempId; }
    public void setTempId(String tempId) { this.tempId = tempId; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Boolean getDeletedBySender() { return deletedBySender; }
    public void setDeletedBySender(Boolean deletedBySender) { this.deletedBySender = deletedBySender; }
    public Boolean getDeletedByReceiver() { return deletedByReceiver; }
    public void setDeletedByReceiver(Boolean deletedByReceiver) { this.deletedByReceiver = deletedByReceiver; }
}