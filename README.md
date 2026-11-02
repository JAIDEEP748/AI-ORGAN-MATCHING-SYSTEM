# AI-Assisted Organ Matching and Recipient Ranking System

An intelligent, full-stack decision-support platform designed to streamline clinical organ allocation, calculate donor-to-recipient logistical routes, monitor Cold Ischemia Time preservation limits with automated expiry removal, and rank recipients using explainable AI (XGBoost + SHAP).

> **Disclaimer:** This project is an academic clinical decision-support prototype. It is inspired by national organ-allocation frameworks (e.g., NOTTO / UNOS) and is designed strictly for research, simulation, and academic demonstration. It must not be used for actual clinical or transplant decisions without certified regulatory validation.

---

## 🌟 Key Features

### 1. Role-Based Authentication & Authorization (RBAC)
- **Donor-Side Hospital Portal**: Log retrieved organs, register donors, evaluate cold ischemia preservation limits, and initiate AI matching.
- **Recipient-Side Hospital Portal**: Manage waitlist candidates, review incoming organ offers with interactive **ACCEPT** / **REJECT** workflows, and view clinical compatibility reviews.
- **Admin & Coordination Center**: Global monitoring of all match runs, hospital readiness infrastructure, and immutable system audit logs.

| Role | Portal Type | Key Capabilities | Default Demo Credentials |
|---|---|---|---|
| **Donor Hospital** | `donor_hospital` | Register Donors, Log Retrieved Organs, Run AI Matching | `donor_hospital` / `donor123` |
| **Recipient Hospital** | `recipient_hospital` | Manage Recipient Waitlist, Review Organ Offers (ACCEPT / REJECT), Clinical Reviews | `recipient_hospital` / `recipient123` |
| **Transplant Administrator** | `admin` | Full System Governance, All Dashboards & Audit Trails | `admin` / `admin123` |

---

### 2. Automated Organ Expiration & Safe Cold Ischemia Removal
- **Clinical Cold Ischemia Window Tracking**: Every organ is assigned strict maximum preservation time limits based on organ type and technique:
  - **Heart**: 4 hours (Static Cold Storage) / 6 hours (Machine Perfusion)
  - **Lung**: 6 hours (Static Cold Storage) / 8 hours (Machine Perfusion)
  - **Liver**: 12 hours (Static Cold Storage) / 16 hours (Machine Perfusion)
  - **Kidney**: 24 hours (Static Cold Storage) / 36 hours (Machine Perfusion)
  - **Pancreas**: 12 hours | **Intestine**: 8 hours
- **Live 1-Second Countdown**: Real-time visual progress bar and countdown timer on every organ card.
- **Automated Removal from Matching**: The moment an organ's preservation window elapses, the backend and frontend automatically change its status to `Expired`, remove it from the active matching pool, and archive it into the **Auto-Removed / Expired** view.
- **Interactive Quick-Expire Demo**: Includes a 1-click test button on active organs to simulate immediate expiration and verify auto-removal live.

---

### 3. Inter-Hospital Distance & Transit Logistics
- **GPS-Based Route Calculations**: Calculates precise Haversine distance in kilometers between donor procurement hospitals and recipient transplant centres across major medical hubs (Chennai, Bengaluru, Hyderabad, Mumbai, Delhi).
- **Emergency Transit Time Estimation**:
  - Distance $\le 80\text{ km}$: Blue-corridor emergency road ambulance (~50 km/h average city corridor).
  - Distance $> 80\text{ km}$: Dedicated chartered air ambulance corridor (~450 km/h flight + 40 mins apron logistics).
- **Visual Logistical Route Card**: Displayed on each candidate match card, illustrating origin hospital, exact distance, estimated transit time, and destination hospital.

---

### 4. Explainable AI Matching (XGBoost + SHAP)
- **Multi-Factor Clinical Scoring**: Evaluates candidate recipients based on medical urgency, waiting time, distance feasibility, and recipient hospital infrastructure readiness.
- **SHAP Feature Attributions**: Visualizes exact feature contributions (+/- impact) explaining *why* a particular recipient was ranked top priority.
- **Multi-Hospital Offer Fallback**: If Hospital Rank #1 rejects or fails to respond within the emergency offer window, the offer automatically cascades to Rank #2.

---

### 5. Hospital Infrastructure & Readiness Controls
- **Live Readiness Toggles**: Coordinators can toggle real-time hospital infrastructure (ICU Bed Availability, Operating Theatres, and On-Call Transplant Surgical Teams).
- **Dynamic Score Feeds**: Hospital readiness status directly feeds into the AI allocation ranking algorithm.

---

### 6. Functional Real-Time Search & Navigation
- Top navigation search bar provides instantaneous, live search across donors, waiting recipients, and available harvested organs with direct navigation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, React Router v7 |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2, Uvicorn |
| **Database** | SQLite (with automatic migrations and live UTC timestamps) |
| **Machine Learning** | XGBoost, SHAP (SHapley Additive exPlanations), scikit-learn, NumPy, Pandas |
| **Communications** | Gmail SMTP / Background Alert Dispatcher |

---

## 📂 Project Structure

```text
AI-ORGAN-MATCHING-SYSTEM/
├── backend/
│   ├── app/
│   │   ├── auth_routes.py        # Authentication & RBAC endpoints
│   │   ├── database.py           # Database engine & session generator
│   │   ├── email_service.py      # Automated hospital alert notification
│   │   ├── main.py               # FastAPI entry point & organ expiration endpoints
│   │   ├── match_generator.py    # Haversine distance, compatibility & match-run engine
│   │   ├── ml_model.py           # XGBoost priority predictor & SHAP explainer
│   │   ├── ml_routes.py          # AI ranking, offer response, and review routes
│   │   ├── models.py             # SQLAlchemy database models
│   │   └── schemas.py            # Pydantic validation schemas
│   ├── data/organ_transplant/    # CSV datasets for hospitals, donors, recipients
│   ├── organ_match.db            # Persistent SQLite database
│   ├── requirements.txt          # Python backend dependencies
│   └── seed_database.py          # Database seeding utility
│
├── src/
│   ├── components/               # Common UI components, layout, sidebars, modals
│   ├── context/                  # AuthContext (session storage) & ThemeContext
│   ├── pages/
│   │   ├── auth/                 # Sign-in (Donor vs. Recipient), Forgot & Reset Password
│   │   ├── matching/             # AI Matching & Inter-Hospital Distance view
│   │   ├── organs/               # Organ Inventory with real-time countdown & auto-removal
│   │   ├── recipients/           # Recipient registry & profile
│   │   ├── donors/               # Donor registry & profile
│   │   ├── hospitals/            # Hospital readiness dashboard
│   │   ├── Settings.tsx          # Infrastructure toggles, password updates, audit export
│   │   └── Dashboard.tsx         # Executive KPI dashboard
│   ├── routes/AppRoutes.tsx      # Application routing
│   └── services/api.ts           # Centralized API service with auth token interceptor
│
├── package.json                  # Frontend dependencies
├── vite.config.ts                # Vite configuration
└── README.md                     # Comprehensive project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher) & **npm**
- **Python** (v3.11 or higher) & **pip**
- **Git**

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/JAIDEEP748/AI-ORGAN-MATCHING-SYSTEM.git
cd AI-ORGAN-MATCHING-SYSTEM
```

---

### Step 2: Set Up Backend

```bash
cd backend

# Create and activate virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start at **`http://127.0.0.1:8000`**.  
Interactive Swagger API documentation is available at **`http://127.0.0.1:8000/docs`**.

---

### Step 3: Set Up Frontend

In a new terminal window:
```bash
# Navigate to the project root
npm install

# Start Vite dev server
npm run dev
```
The frontend will start at **`http://localhost:5173`** (or **`http://localhost:5174`**).

---

## 🧪 Testing the Workflow

1. **Sign In**:
   - Go to `http://localhost:5174/login`.
   - Choose **Donor Hospital** and log in with `donor_hospital` / `donor123`.
2. **Monitor Live Organ Expirations**:
   - Open **Organ Inventory** in the sidebar.
   - Observe live Cold Ischemia countdown timers ticking in real time.
   - Click **"Quick Expire (Demo)"** on any active organ to observe instant auto-removal from the active pool.
3. **Run AI Matching with Distance Calculations**:
   - Click **"Run AI Match"** on an available organ.
   - Click **"Find AI-Ranked Recipients"**.
   - Inspect the **Inter-Hospital Route Card**: observe donor hospital, transit distance in km, estimated transit time, and recipient hospital.
4. **Log Out & Recipient Review**:
   - Log out via the sidebar or topbar.
   - Sign in as **Recipient Hospital** (`recipient_hospital` / `recipient123`) to review organ offers and clinical matches.

---

## 📜 License
This project is open-source and intended for academic, research, and educational purposes.
