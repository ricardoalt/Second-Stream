
MVP blueprint for SecondStream.

1. Core Product Problem
Industrial byproduct brokers operate in an environment where critical discovery information is fragmented, incomplete, and unstructured, forcing operators to rely heavily on tacit knowledge.
Discovery requires gathering information across:
material composition
generating process
location
logistics constraints
regulatory classification
volume and recurrence
cost structure
buyer market options
Today this process is manual, nonlinear, and dependent on human expertise.
The result:
discovery pipelines stall waiting for missing information
regulatory risks increase
pricing knowledge stays trapped in individual operators
scaling requires hiring more experienced operators
The discovery memo confirms that discovery is messy and nonlinear, with missing information and fragmented documentation being constant bottlenecks.
SecondStream solves this by turning discovery into a structured intelligence system.

2. Key Product Insights from the Discovery Memo
Discovery is the primary bottleneck
Operators state discovery is a multi-dimensional matrix, not a linear workflow.
Clients rarely know what they actually have
Facilities often provide:
wrong names
outdated SDS
incomplete documentation.
Missing information blocks deals
Pipeline stalls because key discovery information is incomplete.
Regulatory classification drives feasibility
Environmental rules heavily affect how materials can move.
Location matters
Transport costs and facility location change feasibility.
Pricing knowledge is tacit
Margin knowledge lives in the operator’s head.
Teams are small but workloads are massive
Manual workflows create operational overload.

3. MVP Product Definition
The MVP must solve one problem only:
Turn messy discovery into structured opportunity intelligence.
Minimum system:
Capture discovery information from field agents
Convert unstructured data into structured records
Identify missing information required for proposals
Track discovery progress toward proposal readiness
The MVP does NOT automate logistics, regulatory parsing, or vendor networks yet.

4. Product Modules
1. Discovery Wizard
Core intake interface used by field agents.
Captures:
notes
voice
documents
photos
structured answers
Output:
Creates a Waste Stream record.

2. Waste Stream Engine
Central object representing a material stream.
Stores:
material description
generating process
location
volume
recurrence
cost structure
regulatory indicators

3. Customer Registry
Database of facilities.
Stores:
companies
locations
contact people
relationship type (buyer / generator)

4. Opportunity Intelligence Dashboard
Shows:
discovered streams
missing information
deal stage
proposal readiness

5. Data Processing / Classification Engine
Processes:
documents
notes
images
Outputs:
structured fields
suggested classifications
missing info flags

5. User Roles
Field Agent
Responsible for:
site visits
data capture
waste stream discovery
Analyst
Responsible for:
validating classifications
preparing proposals
pricing analysis
Admin
Responsible for:
managing users
vendor lists
regulatory data updates

6. Product Workflow
Step 1 — Site Visit
Field agent gathers information.

Step 2 — Discovery Wizard
Agent uploads:
notes
documents
photos

Step 3 — AI Processing
System extracts:
material type
volume
recurrence
location
generating process

Step 4 — Waste Stream Creation
System creates:
WasteStream record

Step 5 — Missing Information Detection
System flags:
missing SDS
missing volume
unknown process origin
unknown cost

Step 6 — Dashboard Monitoring
Agents see:
incomplete opportunities
next actions
deal readiness

7. Agile Epics
Discovery Wizard
Waste Stream Management
Customer Registry
Document Ingestion
AI Classification Engine
Opportunity Dashboard
Deal Stage Tracking

8. User Stories
Discovery Capture
As a field agent
I want to upload discovery information
So that waste streams are captured during site visits.

Waste Stream Creation
As a system
I want to generate a waste stream record
So that discovery data becomes structured.

Customer Linking
As a field agent
I want waste streams linked to customers
So that opportunities are organized by facility.

Missing Information Detection
As a field agent
I want the system to flag missing information
So that I know what to collect next.

Opportunity Dashboard
As a field agent
I want to see all discovered streams
So that I can prioritize opportunities.

9. Acceptance Criteria
Discovery Upload
Given a field agent uploads documents
When the upload completes
Then the system stores the documents.

Waste Stream Generation
Given discovery data exists
When the system processes the data
Then a WasteStream record is created.

Missing Data Detection
Given a waste stream is incomplete
When required fields are missing
Then the system flags them.

Customer Creation
Given a waste stream references a company
When the company does not exist
Then the system prompts the user to create one.

10. Engineering Tasks
Discovery Wizard
Build multi-input capture interface
Support file uploads
Support text input
Save discovery session
AI Extraction
OCR document ingestion
NLP extraction
structured entity extraction
Waste Stream Engine
create waste stream model
classification logic
Dashboard
opportunity status view
missing data indicators

11. Suggested Technical Architecture
Frontend
React / Next.js
Features:
wizard UI
dashboard
file uploads

Backend
Node.js (NestJS)
Responsibilities:
API
processing jobs
authentication

Database
PostgreSQL
Structured relational data.

Document Storage
AWS S3

AI Layer
Python microservice.
Functions:
OCR
NLP extraction
classification

Background Jobs
Redis + BullMQ

12. Database Structure
Customers
id
name
industry
relationship_type
created_at

Locations
id
customer_id
address
city
state
zip
location_type

WasteStreams
id
customer_id
material_name
volume
recurrence
process_origin
status
created_at

DiscoveryRecords
id
waste_stream_id
notes
voice_transcript
created_at

Documents
id
discovery_record_id
file_url
document_type

ClassificationResults
id
waste_stream_id
material_classification
confidence_score

Tasks
id
waste_stream_id
task_type
status
due_date

13. API Endpoints
Waste Streams
POST /waste-streams
GET /waste-streams
GET /waste-streams/{id}
DELETE /waste-streams/{id}

Customers
POST /customers
GET /customers

Discovery
POST /discovery/upload
POST /discovery/process

Documents
POST /documents/upload

Dashboard
GET /opportunities

14. AI / Data Processing Pipeline
Step 1
Document uploaded.

Step 2
OCR extraction.

Step 3
NLP extraction:
Identify:
material names
quantities
regulatory references
process terms

Step 4
Classification model maps data to:
Material
Process
Volume
Location
Compliance indicators

Step 5
Missing data detection.

15. MVP Development Roadmap
Sprint 1
Core platform.
Build:
authentication
customer database
waste stream database
discovery wizard basic
document upload

Sprint 2
Data processing.
Build:
OCR pipeline
NLP extraction
waste stream auto-creation
missing information detection

Sprint 3
Operational intelligence.
Build:
opportunity dashboard
deal stage tracking
notifications for missing data
editing / validation workflow

Final Product Insight
The discovery memo reveals a crucial truth:
The proposal is simple.
Discovery is the real business.
SecondStream should therefore focus first on:
structuring discovery and institutionalizing operator knowledge.
Everything else—logistics networks, predictive pricing, vendor graphs—comes later.


