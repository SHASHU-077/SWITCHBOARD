# Pamoja Autonomous Backbone - Operational Handbook
## RESTRICTED ACCESS: INTERNAL PERSONNEL ONLY

This document provides a step-by-step guide for platform employees on how to onboard clients, manage organizations, and maintain system integrity.

---

### 1. Administrative Security Table
| Module | Identity/ID | Primary Key / Password |
| :--- | :--- | :--- |
| **Sentinel Master Console** | Moses Masolo Mukubali | `Mama1989Netty` |
| **PBX Sentinel Core** | *System Identity* | `#Pamoja*musa@1989.27312151` |
| **GSM Gateway Terminal** | *Node Identity* | `Pamoja.musa@1989/0791242243` |
| **Organization Registry** | *Audit Identity* | `07/08/1989.0791242243` |

---

### 2. Client & Organization Onboarding Workflow

#### Step 1: Verification & Registration
1. Access the **Organization Audit Registry** using the Registry Password listed above.
2. Register the organization and assign its **3-Digit Routing Prefix** (e.g., `*001*`).

#### Step 2: Agent Node Deployment (Virtual Handshake)
Digital agents are onboarded through a unique internet-bound handshake:
1. **Platform Registration**: Register the agent with a numerical code (e.g., `02`). The system builds an identifier like `*002*Agent02#`.
2. **Dialer Setup**: The agent opens the **Pamoja Virtual Dialer** (downloadable from the dashboard).
3. **The Handshake**: The agent dials the organization prefix + their numerical code (e.g., `*002*02#`).
4. **Validation**: This action creates a permanent bridge between the physical device and the platform's routing engine.

---

### 3. Virtual Dialer Protocol
The Virtual Dialer is designed specifically for security and intentional call handling.

#### Handshake Logic
- **Organization Prefix**: Identifies the institution (e.g., `*002*`).
- **Activation Code**: The agent's numerical sequence (e.g., `02#`).
- **Full Handshake**: `*PREFIX*CODE#` triggers the link.

#### Dialer Identity
Once a handshake is successful, the dialer's header reflects the platform signature:
- **Format**: `Pamoja Switchboard *PREFIX*CODE#`
- **Purpose**: Provides visual confirmation that the agent is securely linked to the institutional switchboard.

### 4. Stealth Transit & Regional Anonymity
To ensure seamless operation across East African corridors (Kenya, Uganda, Tanzania, Rwanda) and global endpoints, the platform utilizes **Stealth Transit Protocol (STP)**.

#### GSM Bypass Engine
- **Anonymity**: Outbound calls link anonymously without recognition by GSM providers in East African countries.
- **Provider Decoupling**: The call is terminated via decentralized internet-bound nodes, escaping recognition and bypassing restrictive carrier permissions.
- **Global Termination**: The system supports full termination of both inbound local and international calls across the Pamoja Backbone.

#### Outbound Dialing (Bridge Protocol)
1. Open the Dialer (Must be on the internet).
2. Dial the target number using the **Bridge Format**: `*PREFIX*CONTACT_WITH_COUNTRY_CODE#`.
   - *Example*: `*003*254714328724#`
3. Press **Dial & Link**.
4. The system creates a handshake with the Switchboard and terminates the call via the organization's **Absorbed GSM** or **Virtual Number**.
5. The receiver sees the organization's identity, NOT the agent's real phone.

#### Truecaller Identity Sync
- The Pamoja Switchboard automatically updates the Truecaller registry for all absorbed/virtual contacts.
- This ensures that when an organization calls a client, the organization's legal name appears on the receiver's screen, increasing pickup rates.

#### Inbound Management (The Slider)
To ensure intentional call handling, the dialer uses a **Dual-Slide Buffer**:
- **Slide Right**: Accepts the incoming encrypted stream and bridges to the caller.
- **Slide Left**: Rejects the call and sends it back to the organization's Queue Engine.

---

### 4. Inbound Routing & Queue Management

#### Inbound Flow (GSM to Agent)
1. **Origination**: Call originates from a standard GSM number.
2. **Bridge**: The call hits the **Pamoja Switchboard** (Autonomous PBX Engine).
3. **Agent Distribution**: The call is immediately routed to an available Agent Node.
4. **Capacity**: The system supports up to **50 concurrent agent connections** per organization trunk.

#### Queue Announcement Engine (Q.A.E)
If all 50 agents are currently engaged in active bridges:
1. The **Queue Announcement Engine** triggers automatically.
2. The caller hears the organization's **Custom Inbound Message**.
3. **Voice Profiles**:
   - **Masculine ("The Sentinel")**: A captivating, deep, African-centered voice inspired by the resonance of Morgan Freeman. 
   - **Female ("Zawadi's Soul")**: A captivating African-centered voice with a subtle, melodic Kenyan English accent, designed to maintain caller engagement.
4. **Truecaller Guard**: Even while waiting in queue, the system maintains the organization's Truecaller identity for the incoming bridge.
5. **Constraints**: The custom announcement must not exceed **500 words**.
6. The caller remains in an encrypted digital buffer until an agent node becomes free.

---

### 5. Session Security & Access Control
- **Auto-Logout Policy**: To protect the integrity of the Sentinel Master Console and sensitive PII (Personally Identifiable Information), the Enterprise Console implements a **10-minute idle timeout**. If no interaction is detected for 10 minutes, the session is forcefully terminated and the user must re-authenticate.
- **Sentinel Key Isolation**: All management commands are wrapped in Asterisk Sentinel protocols, requiring separate cryptographic keys for sensitive modules.
- **Activity Monitoring**: The console logs all interaction telemetry to ensure total transparency across the autonomous backbone.

### 6. Technical Maintenance
- **GSM Stealth:** The GSM Gateway operates in **Permanent Stealth Mode**. This protocol hard-randomizes all hardware signatures (IMEIs) automatically to ensure total evasion of carrier tracking. This feature is non-negotiably active to protect the integrity of the Pamoja backbone.
- **Trunk Refresh:** If call quality drops, access the **Autonomous PBX Engine** and perform a SIP Trunk Refresh on the affected carrier (Safaricom, Airtel, etc.).

---

### 7. Asterisk Dialplan Baseline (Implementation Guide)
The following dialplan provides the logic for intra-institutional calling and outbound bridge termination. Add this to your `extensions.conf` file.

```ini
[globals]
; --- GLOBAL PARAMETERS (Owner to fill these) ---
; REQUIRED: SIP Trunk Credentials from your VoIP Provider
TRUNK_USER=      ; <MISSING_VALUE>
TRUNK_PASS=      ; <MISSING_VALUE>
TRUNK_HOST=      ; <MISSING_VALUE>

[pamoja-inbound]
; Universal Inbound Bridge
exten => _.,1,NoOp(Inbound Call from ${CALLERID(num)})
 same => n,Set(TARGET_AGENT=${DB(agent_map/${EXTEN})})
 same => n,GotoIf($["${TARGET_AGENT}" == ""]?no-agent:route-call)
 
 same => n(route-call),Dial(PJSIP/${TARGET_AGENT},30)
 same => n,Hangup()
 
 same => n(no-agent),Playback(pamoja-queue-wait) ; REQUIREMENT: Upload audio file to /var/lib/asterisk/sounds/
 same => n,Queue(pamoja-main-queue)
 same => n,Hangup()

[pamoja-outbound]
; Universal Outbound Bridge (*Prefix*Number#)
; REQUIREMENT: Outbound Trunk Configuration matching your Provider's Dial Patterns
exten => _*XXXX*X.#,1,NoOp(Outbound Bridge via Pamoja Infrastructure)
 same => n,Set(ORG_PREFIX=${EXTEN:1:4})
 same => n,Set(TARGET_NUM=${EXTEN:6:-1})
 same => n,Dial(PJSIP/${TARGET_NUM}@trunk-provider)
 same => n,Hangup()

[pamoja-intra-call]
; Intra-Institutional Calling (*Prefix*ShortCode#)
; Matches *001*07# to call Agent 07 in Org 001
exten => _*XXXX*XXX#,1,NoOp(Intra-Node Call)
 same => n,Set(ORG_ID=${EXTEN:1:4})
 same => n,Set(TARGET_CODE=${EXTEN:6:-1})
 same => n,Dial(PJSIP/agent-${ORG_ID}-${TARGET_CODE},20)
 same => n,Hangup()
```

#### Missing Implementation Requirements:
1. **SIP Trunk Credentials**: You must obtain a SIP Trunk from a local carrier (Safaricom, Airtel, etc.) or a global provider (Twilio, Vonage).
2. **DID Mapping**: Map your purchased virtual numbers to organization IDs in the Asterisk DB (`asterisk -rx "database put agent_map <NUMBER> <AGENT_ID>"`).
3. **Queue Configuration**: Define `pamoja-main-queue` in `queues.conf`.
4. **Security Hardening**: Implement Fail2Ban on port 5060 to prevent brute-force attacks on your PBX core.
5. **SSL Certificates**: Required for securing the WebRTC signaling between the Virtual Dialer and the PBX.

---
**Pamoja Switchboard & Autonomous Backbone**
*Decentralizing Communications. Bypassing Legacy Gates.*
