# Dev Mantra Admin API Docs

Base URL: `https://startups.devmantra.com`

All endpoints require **HTTP Basic Authentication** via the `Authorization` header.

---

## Authentication

Every request must include:

```
Authorization: Basic <base64(username:password)>
```

### How to generate the header

```js
const credentials = btoa('your_username:your_password');
const headers = {
  'Authorization': `Basic ${credentials}`
};
```

### Set credentials in your .env file

```env
ADMIN_API_USERNAME=your_username
ADMIN_API_PASSWORD=your_strong_password
```

---

## CORS

All endpoints return `Access-Control-Allow-Origin: *` so you can call them from any HTML page or dashboard.

---

## Endpoints

### 1. List All Leads

Returns all form submissions (paginated), newest first.

```
GET /api/admin/leads
```

**Query Parameters**

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `page` | number | 1 | — | Page number |
| `limit` | number | 20 | 100 | Results per page |

**Example Request**

```js
const res = await fetch('https://startups.devmantra.com/api/admin/leads?page=1&limit=20', {
  headers: {
    'Authorization': `Basic ${btoa('username:password')}`
  }
});
const data = await res.json();
```

**Example Response**

```json
{
  "page": 1,
  "limit": 20,
  "total": 87,
  "totalPages": 5,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "founderName": "Rahul Sharma",
      "email": "rahul@example.com",
      "phone": "+919876543210",
      "companyName": "TechVentures Pvt Ltd",
      "sector": "saas",
      "createdAt": "2025-05-06T10:30:00.000Z",
      "totalScore": 74,
      "tier": "series_a_fundable"
    }
  ]
}
```

---

### 2. Get Full Lead Details

Returns complete data for a single lead — including all question responses, dimension scores, flags, and full AI output.

```
GET /api/admin/leads/:id
```

**Path Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | UUID | Lead ID from the leads list |

**Example Request**

```js
const id = '550e8400-e29b-41d4-a716-446655440000';
const res = await fetch(`https://startups.devmantra.com/api/admin/leads/${id}`, {
  headers: {
    'Authorization': `Basic ${btoa('username:password')}`
  }
});
const lead = await res.json();
```

**Example Response**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "founderName": "Rahul Sharma",
  "email": "rahul@example.com",
  "phone": "+919876543210",
  "companyName": "TechVentures Pvt Ltd",
  "sector": "saas",
  "createdAt": "2025-05-06T10:30:00.000Z",
  "totalScore": 74,
  "tier": "series_a_fundable",
  "dimensionScores": {
    "stage": 80,
    "opportunity": 70,
    "mgmt": 85,
    "competitive": 60,
    "channels": 75,
    "funding": 65
  },
  "weakestDimension": "competitive",
  "flags": ["no_moat", "low_arr"],
  "responses": [
    { "questionId": "q3", "answer": "revenue_generating", "score": 80 },
    { "questionId": "q4", "answer": "subscription", "score": 70 },
    { "questionId": "q5", "answer": "large", "score": 70 },
    { "questionId": "q6", "answer": "20_50_percent", "score": 70 },
    { "questionId": "q7", "answer": "2_exits", "score": 85 },
    { "questionId": "q8", "answer": "strong_board", "score": 85 },
    { "questionId": "q9", "answer": "weak_moat", "score": 60 },
    { "questionId": "q10", "answer": "multi_channel", "score": 75 },
    { "questionId": "q11", "answer": "series_a", "score": 65 }
  ],
  "aiOutput": {
    "executiveVerdict": "TechVentures shows strong fundamentals with a proven team and solid revenue growth, but lacks a defensible moat...",
    "top3Actions": [
      {
        "title": "Build Competitive Defensibility",
        "body": "File 2 provisional patents in the next 90 days and establish exclusive data partnerships..."
      },
      {
        "title": "Strengthen Unit Economics",
        "body": "Target CAC:LTV ratio of 1:4 before your Series A pitch..."
      },
      {
        "title": "Prepare Investor Data Room",
        "body": "Compile 18 months of MoM revenue data, churn rates, and cohort analysis..."
      }
    ],
    "industryBenchmark": "SaaS founders at Series A typically show >120% NRR and <12 month CAC payback..."
  }
}
```

---

### 3. List All Results (Scores & Tiers)

Returns all scored results with dimension breakdowns — great for analytics and filtering by tier.

```
GET /api/admin/results
```

**Query Parameters**

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `page` | number | 1 | — | Page number |
| `limit` | number | 20 | 100 | Results per page |
| `tier` | string | — | — | Filter by tier (see valid values below) |

**Valid `tier` values**

| Value | Score Range |
|-------|-------------|
| `idea_stage` | 0 – 49 |
| `seed_ready_with_gaps` | 50 – 69 |
| `series_a_fundable` | 70 – 89 |
| `top_decile` | 90 – 100 |

**Example Request**

```js
// All results
const res = await fetch('https://startups.devmantra.com/api/admin/results?page=1&limit=50', {
  headers: { 'Authorization': `Basic ${btoa('username:password')}` }
});

// Filter by tier
const res = await fetch('https://startups.devmantra.com/api/admin/results?tier=series_a_fundable', {
  headers: { 'Authorization': `Basic ${btoa('username:password')}` }
});
```

**Example Response**

```json
{
  "page": 1,
  "limit": 20,
  "total": 87,
  "totalPages": 5,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "founderName": "Rahul Sharma",
      "email": "rahul@example.com",
      "companyName": "TechVentures Pvt Ltd",
      "sector": "saas",
      "createdAt": "2025-05-06T10:30:00.000Z",
      "totalScore": 74,
      "tier": "series_a_fundable",
      "dimensionScores": {
        "stage": 80,
        "opportunity": 70,
        "mgmt": 85,
        "competitive": 60,
        "channels": 75,
        "funding": 65
      },
      "weakestDimension": "competitive",
      "flags": ["no_moat", "low_arr"]
    }
  ]
}
```

---

### 4. Dashboard Stats

Returns aggregate statistics across all submissions — total count, avg score, tier distribution, sector breakdown, and recent activity.

```
GET /api/admin/stats
```

**No query parameters.**

**Example Request**

```js
const res = await fetch('https://startups.devmantra.com/api/admin/stats', {
  headers: { 'Authorization': `Basic ${btoa('username:password')}` }
});
const stats = await res.json();
```

**Example Response**

```json
{
  "totalSubmissions": 87,
  "avgScore": 63.4,
  "maxScore": 96,
  "minScore": 18,
  "tierBreakdown": {
    "seed_ready_with_gaps": 34,
    "series_a_fundable": 28,
    "idea_stage": 19,
    "top_decile": 6
  },
  "sectorBreakdown": {
    "saas": 31,
    "fintech": 22,
    "d2c": 15,
    "services": 10,
    "manufacturing": 6,
    "other": 3
  },
  "recentSubmissions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "companyName": "TechVentures Pvt Ltd",
      "totalScore": 74,
      "createdAt": "2025-05-06T10:30:00.000Z"
    }
  ],
  "submissionsLast7Days": 12,
  "submissionsLast30Days": 41
}
```

---

## Error Responses

| Status | Meaning |
|--------|---------|
| `401` | Missing or invalid credentials |
| `400` | Invalid query parameter (e.g. unknown tier) |
| `404` | Lead ID not found |
| `500` | Server error — check server logs |

All errors return:
```json
{ "error": "Error message here" }
```

---

## Complete Dashboard Fetch Example

```html
<!DOCTYPE html>
<html>
<head><title>Dev Mantra Admin</title></head>
<body>
<script>
  const BASE = 'https://startups.devmantra.com';
  const AUTH = `Basic ${btoa('your_username:your_password')}`;
  const headers = { Authorization: AUTH };

  async function loadDashboard() {
    const [stats, leads] = await Promise.all([
      fetch(`${BASE}/api/admin/stats`,  { headers }).then(r => r.json()),
      fetch(`${BASE}/api/admin/leads?limit=50`, { headers }).then(r => r.json()),
    ]);

    console.log('Total submissions:', stats.totalSubmissions);
    console.log('Avg score:', stats.avgScore);
    console.log('Tier breakdown:', stats.tierBreakdown);
    console.log('All leads:', leads.data);
  }

  async function loadLead(id) {
    const lead = await fetch(`${BASE}/api/admin/leads/${id}`, { headers }).then(r => r.json());
    console.log('AI Verdict:', lead.aiOutput.executiveVerdict);
    console.log('Actions:', lead.aiOutput.top3Actions);
    console.log('Responses:', lead.responses);
  }

  loadDashboard();
</script>
</body>
</html>
```

---

## Dimension Reference

| Key | Dimension | Questions |
|-----|-----------|-----------|
| `stage` | Business Stage | q3 |
| `opportunity` | Market Opportunity | q4, q5, q6 |
| `mgmt` | Management Team | q7, q8 |
| `competitive` | Competitive Moat | q9 |
| `channels` | Sales Channels | q10 |
| `funding` | Funding Ask | q11 |
