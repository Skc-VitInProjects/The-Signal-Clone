from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import User, Contact, Conversation, ConversationParticipant, Message, MessageReaction
from app.auth import hash_password

def seed_database(db: Session):
    # Check if already seeded
    existing_user = db.query(User).first()
    if existing_user:
        return

    print("Seeding Signal Clone database with realistic demo data...")

    now = datetime.now(timezone.utc)

    # 1. Create Users
    users_data = [
        {
            "username": "sarah_c",
            "phone": "+1 555-0100",
            "display_name": "Sarah Connor",
            "about": "Security first. Always encrypted 🔒",
            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            "is_online": True,
            "last_seen": now
        },
        {
            "username": "alex_r",
            "phone": "+1 555-0101",
            "display_name": "Alex Rivera",
            "about": "Building distributed systems 🚀",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            "is_online": True,
            "last_seen": now
        },
        {
            "username": "david_k",
            "phone": "+1 555-0102",
            "display_name": "David Kim",
            "about": "Cryptographer & Privacy advocate 🛡️",
            "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
            "is_online": False,
            "last_seen": now - timedelta(minutes=24)
        },
        {
            "username": "maria_s",
            "phone": "+1 555-0103",
            "display_name": "Maria Santos",
            "about": "Product Designer @ Signal 🎨",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "is_online": True,
            "last_seen": now
        },
        {
            "username": "elena_r",
            "phone": "+1 555-0104",
            "display_name": "Elena Rostov",
            "about": "Auditing protocols & enjoying matcha 🍵",
            "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
            "is_online": False,
            "last_seen": now - timedelta(hours=2)
        }
    ]

    users = {}
    for ud in users_data:
        u = User(
            username=ud["username"],
            phone=ud["phone"],
            display_name=ud["display_name"],
            about=ud["about"],
            avatar_url=ud["avatar_url"],
            is_online=ud["is_online"],
            last_seen=ud["last_seen"],
            password_hash=hash_password("signal123")
        )
        db.add(u)
        db.flush()
        users[ud["username"]] = u

    # 2. Add Contacts for Sarah Connor (Primary demo account)
    sarah = users["sarah_c"]
    for uname, user_obj in users.items():
        if uname != "sarah_c":
            db.add(Contact(
                user_id=sarah.id,
                contact_user_id=user_obj.id,
                nickname=user_obj.display_name.split()[0]
            ))
            db.add(Contact(
                user_id=user_obj.id,
                contact_user_id=sarah.id,
                nickname="Sarah"
            ))

    # 3. Create Direct Conversation: Sarah & Alex
    c_alex = Conversation(is_group=False, created_by_id=sarah.id, disappearing_timer=0)
    db.add(c_alex)
    db.flush()
    db.add(ConversationParticipant(conversation_id=c_alex.id, user_id=sarah.id, role="member"))
    db.add(ConversationParticipant(conversation_id=c_alex.id, user_id=users["alex_r"].id, role="member"))

    m1 = Message(
        conversation_id=c_alex.id,
        sender_id=users["alex_r"].id,
        content="Hey Sarah! Have you checked the latest security patch for the WebSocket pipeline?",
        status="read",
        created_at=now - timedelta(minutes=45)
    )
    db.add(m1)
    db.flush()

    m2 = Message(
        conversation_id=c_alex.id,
        sender_id=sarah.id,
        content="Yes, verified the handshake and heartbeat mechanism. Latency is sub-5ms now!",
        status="read",
        reply_to_id=m1.id,
        created_at=now - timedelta(minutes=30)
    )
    db.add(m2)
    db.flush()

    # Reaction on m2
    db.add(MessageReaction(message_id=m2.id, user_id=users["alex_r"].id, emoji="🔥"))

    m3 = Message(
        conversation_id=c_alex.id,
        sender_id=users["alex_r"].id,
        content="Awesome work! Let's demo the typing indicators and read receipts in today's review.",
        status="delivered",
        created_at=now - timedelta(minutes=10)
    )
    db.add(m3)

    # 4. Create Group Conversation: "Core Protocol Team"
    c_group1 = Conversation(
        is_group=True,
        name="Core Protocol Team 🛡️",
        avatar_url="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150&auto=format&fit=crop&q=80",
        description="Encrypted signaling and key exchange architecture",
        created_by_id=sarah.id,
        disappearing_timer=3600  # 1 hour disappearing
    )
    db.add(c_group1)
    db.flush()

    for u in [sarah, users["alex_r"], users["david_k"], users["elena_r"]]:
        role = "admin" if u.id == sarah.id else "member"
        db.add(ConversationParticipant(conversation_id=c_group1.id, user_id=u.id, role=role))

    sys_g1 = Message(
        conversation_id=c_group1.id,
        sender_id=sarah.id,
        content="Sarah Connor created the group \"Core Protocol Team 🛡️\"",
        message_type="system",
        status="delivered",
        created_at=now - timedelta(hours=3)
    )
    db.add(sys_g1)

    gm1 = Message(
        conversation_id=c_group1.id,
        sender_id=users["david_k"].id,
        content="Signal safety number verification is looking solid. Safety numbers match between peers.",
        status="delivered",
        created_at=now - timedelta(hours=2)
    )
    db.add(gm1)
    db.flush()
    db.add(MessageReaction(message_id=gm1.id, user_id=sarah.id, emoji="👍"))
    db.add(MessageReaction(message_id=gm1.id, user_id=users["elena_r"].id, emoji="🔒"))

    gm2 = Message(
        conversation_id=c_group1.id,
        sender_id=users["elena_r"].id,
        content="Reminder: Disappearing messages are enabled on this room (1 hour window).",
        status="delivered",
        created_at=now - timedelta(minutes=20)
    )
    db.add(gm2)

    # 5. Create Group Conversation: "Design & UX Sync"
    c_group2 = Conversation(
        is_group=True,
        name="Design & UX Sync 🎨",
        avatar_url="https://images.unsplash.com/photo-1558655146-d09347e92766?w=150&auto=format&fit=crop&q=80",
        description="Signal Desktop & Mobile interface polish",
        created_by_id=users["maria_s"].id,
        disappearing_timer=0
    )
    db.add(c_group2)
    db.flush()

    for u in [users["maria_s"], sarah, users["alex_r"]]:
        role = "admin" if u.id == users["maria_s"].id else "member"
        db.add(ConversationParticipant(conversation_id=c_group2.id, user_id=u.id, role=role))

    mg1 = Message(
        conversation_id=c_group2.id,
        sender_id=users["maria_s"].id,
        content="The Signal dark mode palette has been matched to #121212 with classic Signal blue accents! Check out the message bubbles.",
        status="read",
        created_at=now - timedelta(hours=1, minutes=15)
    )
    db.add(mg1)
    db.flush()
    db.add(MessageReaction(message_id=mg1.id, user_id=sarah.id, emoji="❤️"))

    # 6. Direct Conversation: Sarah & David
    c_david = Conversation(is_group=False, created_by_id=users["david_k"].id, disappearing_timer=0)
    db.add(c_david)
    db.flush()
    db.add(ConversationParticipant(conversation_id=c_david.id, user_id=sarah.id, role="member"))
    db.add(ConversationParticipant(conversation_id=c_david.id, user_id=users["david_k"].id, role="member"))

    dm1 = Message(
        conversation_id=c_david.id,
        sender_id=users["david_k"].id,
        content="Sent you the encrypted attachment in our shared vault.",
        status="delivered",
        created_at=now - timedelta(hours=5)
    )
    db.add(dm1)

    # 7. Direct Conversation: Sarah & Maria
    c_maria = Conversation(is_group=False, created_by_id=sarah.id, disappearing_timer=0)
    db.add(c_maria)
    db.flush()
    db.add(ConversationParticipant(conversation_id=c_maria.id, user_id=sarah.id, role="member"))
    db.add(ConversationParticipant(conversation_id=c_maria.id, user_id=users["maria_s"].id, role="member"))

    mm1 = Message(
        conversation_id=c_maria.id,
        sender_id=users["maria_s"].id,
        content="All the responsive breakpoints for mobile drawer & desktop panes are verified!",
        status="read",
        created_at=now - timedelta(minutes=5)
    )
    db.add(mm1)

    db.commit()
    print("Database seeding completed successfully!")
