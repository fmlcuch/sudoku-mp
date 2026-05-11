export type ClientEventName = 'room:create' | 'room:join' | 'game:move' | 'game:ready' | 'game:ping';
export type ServerEventName = 'room:state' | 'game:snapshot' | 'game:moveAccepted' | 'game:moveRejected' | 'game:finished';
