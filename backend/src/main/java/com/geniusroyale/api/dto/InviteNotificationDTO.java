package com.geniusroyale.api.dto;

import com.geniusroyale.api.models.GameInvite;

// Esto es lo que el Jugador 2 recibirá en su app
public class InviteNotificationDTO {
    private int inviteId;
    private String senderUsername;
    private String categoryName;

    public InviteNotificationDTO(GameInvite invite) {
        this.inviteId = invite.getId();
        this.senderUsername = invite.getSender().getUsername();
        if (invite.getCategory() != null) {
            this.categoryName = invite.getCategory().getName();
        } else {
            this.categoryName = "Cultura General";
        }
    }

    // Getters (para Gson)
    public int getInviteId() { return inviteId; }
    public String getSenderUsername() { return senderUsername; }
    public String getCategoryName() { return categoryName; }
}