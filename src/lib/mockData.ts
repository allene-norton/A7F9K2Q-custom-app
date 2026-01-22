// src/lib/mockData.ts

import { Customer, AssessmentItem, Assessment } from "../types/types-index";

export const mockCustomers: Customer[] = [
  {
    id: "cust_1",
    clickup_id: "90123456",
    name: "Prairie Center",
    address: "123 Main St, Crystal Lake, IL 60014",
    units: 8,
    contact_email: "steve@prairiecenter.com",
    contact_name: "Steve Wilson"
  },
  {
    id: "cust_2",
    clickup_id: "90123457",
    name: "Oak Street Plaza",
    address: "456 Oak Ave, McHenry, IL 60050",
    units: 12,
    contact_email: "manager@oakstreet.com",
    contact_name: "Maria Garcia"
  },
  {
    id: "cust_3",
    clickup_id: "90123458",
    name: "Riverside Commons",
    address: "789 River Rd, Woodstock, IL 60098",
    units: 6,
    contact_email: "john@riverside.com",
    contact_name: "John Thompson"
  }
];

export const mockAssessmentItems: Record<string, AssessmentItem[]> = {
  "cust_1": [
    {
      id: "item_1",
      clickup_task_id: "task_001",
      location: "Unit 10-12",
      category: "Recommended",
      issue: "Sewage smell detected in common area",
      recommendation: "Inspect and clean drain lines, check for potential blockages or venting issues. May need professional plumber if issue persists.",
      images: [
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800",
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800"
      ],
      estimated_cost_min: 450,
      estimated_cost_max: 650,
      tags: ["plumbing", "urgent-review"],
      comments: "Tenant reported smell getting worse over past week",
      created_date: "2025-03-15",
      technician: "Billy Johnson"
    },
    {
      id: "item_2",
      clickup_task_id: "task_002",
      location: "Exterior - West Side",
      category: "Urgent",
      issue: "Heat tape falling off gutters",
      recommendation: "Reattach heat tape and secure with new clips before winter weather arrives. Risk of ice damming if not addressed.",
      images: [
        "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800"
      ],
      estimated_cost_min: 280,
      estimated_cost_max: 350,
      tags: ["gutters", "exterior", "winter-prep"],
      comments: "Noticed during routine walkthrough",
      created_date: "2025-03-15",
      technician: "Billy Johnson"
    },
    {
      id: "item_3",
      clickup_task_id: "task_003",
      location: "Parking Lot",
      category: "Cosmetic",
      issue: "Faded parking lot striping",
      recommendation: "Repaint parking lot lines and directional arrows for improved visibility and safety.",
      images: [
        "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800"
      ],
      estimated_cost_min: 850,
      estimated_cost_max: 1100,
      tags: ["parking", "exterior", "cosmetic"],
      comments: "Not urgent but should be done before next inspection",
      created_date: "2025-03-15",
      technician: "Billy Johnson"
    },
    {
      id: "item_4",
      clickup_task_id: "task_004",
      location: "Unit 14",
      category: "Recommended",
      issue: "HVAC filter replacement needed",
      recommendation: "Replace air filters and inspect system operation. Schedule for routine maintenance.",
      images: [
        "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800"
      ],
      estimated_cost_min: 120,
      estimated_cost_max: 180,
      tags: ["hvac", "maintenance"],
      comments: "Part of quarterly maintenance schedule",
      created_date: "2025-03-15",
      technician: "Billy Johnson"
    },
    {
      id: "item_5",
      clickup_task_id: "task_005",
      location: "Unit 6 - Kitchen",
      category: "Urgent",
      issue: "Refrigerator not cooling properly",
      recommendation: "Diagnose and repair refrigerator. May need compressor replacement or refrigerant recharge.",
      images: [
        "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800"
      ],
      estimated_cost_min: 300,
      estimated_cost_max: 600,
      tags: ["appliances", "urgent"],
      comments: "Tenant reported issue yesterday, food spoiling",
      created_date: "2025-03-15",
      technician: "Billy Johnson"
    }
  ],
  "cust_2": [
    {
      id: "item_6",
      clickup_task_id: "task_006",
      location: "Roof - Section B",
      category: "Urgent",
      issue: "Roof leak in northwest corner",
      recommendation: "Emergency repair needed. Inspect for damaged shingles and flashing. May require temporary tarp until full repair.",
      images: [
        "https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=800"
      ],
      estimated_cost_min: 800,
      estimated_cost_max: 1200,
      tags: ["roofing", "urgent", "water-damage"],
      comments: "Tenant reported water stains on ceiling",
      created_date: "2025-03-14",
      technician: "Billy Johnson"
    },
    {
      id: "item_7",
      clickup_task_id: "task_007",
      location: "Main Entrance",
      category: "Recommended",
      issue: "Automatic door malfunction",
      recommendation: "Adjust door sensors and lubricate track. May need sensor replacement if issue persists.",
      images: [
        "https://images.unsplash.com/photo-1565116319565-c4366be6eb4e?w=800"
      ],
      estimated_cost_min: 250,
      estimated_cost_max: 400,
      tags: ["entrance", "doors"],
      comments: "Door occasionally sticks or opens slowly",
      created_date: "2025-03-14",
      technician: "Billy Johnson"
    }
  ],
  "cust_3": [
    {
      id: "item_8",
      clickup_task_id: "task_008",
      location: "Common Area",
      category: "Cosmetic",
      issue: "Carpet staining in hallway",
      recommendation: "Professional carpet cleaning or replacement of high-traffic area carpet tiles.",
      images: [
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800"
      ],
      estimated_cost_min: 400,
      estimated_cost_max: 700,
      tags: ["flooring", "cosmetic"],
      comments: "Normal wear and tear from foot traffic",
      created_date: "2025-03-13",
      technician: "Billy Johnson"
    }
  ]
};

// Helper function to get assessment for a customer
export function getAssessmentByCustomer(customerId: string): Assessment {
  const customer = mockCustomers.find(c => c.id === customerId);
  const items = mockAssessmentItems[customerId] || [];
  
  return {
    id: `assess_${customerId}`,
    customer_id: customerId,
    customer_name: customer?.name || "Unknown Customer",
    assessment_date: new Date().toISOString().split('T')[0],
    technician: "Billy Johnson",
    items: items,
    status: "draft",
    created_at: new Date().toISOString()
  };
}

// Helper function to get customer by ID
export function getCustomerById(customerId: string): Customer | undefined {
  return mockCustomers.find(c => c.id === customerId);
}

// Helper to get all customers
export function getAllCustomers(): Customer[] {
  return mockCustomers;
}

// Helper to search customers
export function searchCustomers(query: string): Customer[] {
  const lowerQuery = query.toLowerCase();
  return mockCustomers.filter(
    customer =>
      customer.name.toLowerCase().includes(lowerQuery) ||
      customer.address.toLowerCase().includes(lowerQuery)
  );
}

// Sample mock items that can be used for any company
const sampleMockItems: AssessmentItem[] = [
  {
    id: "mock_item_1",
    clickup_task_id: "mock_task_001",
    location: "Main Entrance",
    category: "Recommended",
    issue: "Door hinges need lubrication",
    recommendation: "Apply lubricant to all entrance door hinges. Schedule for routine maintenance.",
    images: [
      "https://images.unsplash.com/photo-1698244415220-3d1ca844ed67?w=800"
    ],
    estimated_cost_min: 50,
    estimated_cost_max: 100,
    tags: ["doors", "maintenance"],
    comments: "Noticed squeaking during walkthrough",
    created_date: new Date().toISOString().split('T')[0],
    technician: "Billy Johnson"
  },
  {
    id: "mock_item_2",
    clickup_task_id: "mock_task_002",
    location: "Parking Lot",
    category: "Cosmetic",
    issue: "Faded parking lot striping",
    recommendation: "Repaint parking lot lines and directional arrows for improved visibility and safety.",
    images: [
      "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800"
    ],
    estimated_cost_min: 850,
    estimated_cost_max: 1100,
    tags: ["parking", "exterior", "cosmetic"],
    comments: "Not urgent but should be done before next inspection",
    created_date: new Date().toISOString().split('T')[0],
    technician: "Billy Johnson"
  },
  {
    id: "mock_item_3",
    clickup_task_id: "mock_task_003",
    location: "HVAC System",
    category: "Urgent",
    issue: "Air filter replacement needed",
    recommendation: "Replace air filters and inspect system operation. Schedule for routine maintenance.",
    images: [
      "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800"
    ],
    estimated_cost_min: 120,
    estimated_cost_max: 180,
    tags: ["hvac", "maintenance", "urgent"],
    comments: "Part of quarterly maintenance schedule",
    created_date: new Date().toISOString().split('T')[0],
    technician: "Billy Johnson"
  }
];

// Generate a mock assessment for any company (using real company data with mock assessment items)
export function getMockAssessmentForCompany(companyId: string, companyName: string): Assessment {
  return {
    id: `assess_${companyId}`,
    customer_id: companyId,
    customer_name: companyName,
    assessment_date: new Date().toISOString().split('T')[0],
    technician: "Billy Johnson",
    items: sampleMockItems,
    status: "draft",
    created_at: new Date().toISOString()
  };
}
