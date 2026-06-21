/**
 * Seed the pre-built jobs/positions database.
 * Usage: npx tsx scripts/seed-jobs-db.ts
 * 
 * This script populates CL_POSITIONS and CL_JOBS with sample data
 * for development and testing. In production, these tables are populated
 * from web scrapers and manual admin submissions.
 */

import { generateDeduplicationHash } from "../src/lib/utils/dedup";

interface SeedPosition {
  title: string;
  university: string;
  department: string;
  location: string;
  description: string;
  keywords: string[];
}

interface SeedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  keywords: string[];
  source: string;
}

const SAMPLE_POSITIONS: SeedPosition[] = [
  {
    title: "Assistant Professor - Machine Learning",
    university: "IIT Bombay",
    department: "Computer Science",
    location: "Mumbai, India",
    description: "Seeking candidates with strong research in ML, deep learning, or NLP. Must have PhD and publications in top venues.",
    keywords: ["machine_learning", "deep_learning", "nlp", "python", "pytorch", "research"],
  },
  {
    title: "Postdoctoral Fellow - Computer Vision",
    university: "IISc Bangalore",
    department: "Electrical Engineering",
    location: "Bangalore, India",
    description: "2-year postdoc position focusing on medical image analysis and computer vision.",
    keywords: ["computer_vision", "deep_learning", "medical_imaging", "python", "tensorflow"],
  },
  {
    title: "Assistant Professor - Data Science",
    university: "IIT Delhi",
    department: "Mathematics and Computing",
    location: "New Delhi, India",
    description: "Looking for candidates with expertise in statistical learning, big data analytics, or data engineering.",
    keywords: ["data_science", "statistics", "big_data", "python", "r", "machine_learning"],
  },
];

const SAMPLE_JOBS: SeedJob[] = [
  {
    title: "Senior Machine Learning Engineer",
    company: "Google India",
    location: "Bangalore, India",
    description: "Build and deploy ML models at scale. Experience with TensorFlow, distributed systems, and production ML required.",
    keywords: ["machine_learning", "tensorflow", "python", "distributed_systems", "gcp"],
    source: "sample_seed",
  },
  {
    title: "Full Stack Developer",
    company: "Razorpay",
    location: "Bangalore, India",
    description: "Build fintech products using React, Node.js, and Go. Experience with payment systems is a plus.",
    keywords: ["react", "nodejs", "go", "typescript", "payments", "web_development"],
    source: "sample_seed",
  },
  {
    title: "Data Scientist",
    company: "Flipkart",
    location: "Bangalore, India",
    description: "Apply ML to recommendation systems, search ranking, and supply chain optimization.",
    keywords: ["data_science", "machine_learning", "python", "recommendation_systems", "analytics"],
    source: "sample_seed",
  },
  {
    title: "Backend Engineer - Cloud Infrastructure",
    company: "Microsoft India",
    location: "Hyderabad, India",
    description: "Work on Azure cloud infrastructure services. Strong C++/Go skills and distributed systems knowledge needed.",
    keywords: ["cloud_computing", "distributed_systems", "go", "cpp", "azure", "kubernetes"],
    source: "sample_seed",
  },
];

async function seed() {
  const { executeQuery, destroyConnection } = await import("../src/lib/snowflake/client");

  console.log("🌱 Seeding jobs and positions database...\n");

  // Seed positions
  let posCount = 0;
  for (const pos of SAMPLE_POSITIONS) {
    const dedupHash = generateDeduplicationHash(pos.title, pos.university, pos.location);
    try {
      await executeQuery(
        `INSERT INTO CL_POSITIONS (TITLE, UNIVERSITY, DEPARTMENT, LOCATION, DESCRIPTION, KEYWORDS, SOURCE, DEDUP_HASH)
         SELECT ?, ?, ?, ?, ?, PARSE_JSON(?), 'seed', ?
         WHERE NOT EXISTS (SELECT 1 FROM CL_POSITIONS WHERE DEDUP_HASH = ?)`,
        [
          pos.title,
          pos.university,
          pos.department,
          pos.location,
          pos.description,
          JSON.stringify(pos.keywords),
          dedupHash,
          dedupHash,
        ]
      );
      console.log(`  ✓ Position: ${pos.title} @ ${pos.university}`);
      posCount++;
    } catch (err) {
      console.error(`  ✗ Position: ${pos.title} — ${(err as Error).message}`);
    }
  }

  // Seed jobs
  let jobCount = 0;
  for (const job of SAMPLE_JOBS) {
    const dedupHash = generateDeduplicationHash(job.title, job.company, job.location);
    try {
      await executeQuery(
        `INSERT INTO CL_JOBS (TITLE, COMPANY, LOCATION, DESCRIPTION, KEYWORDS, SOURCE, DEDUP_HASH)
         SELECT ?, ?, ?, ?, PARSE_JSON(?), ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM CL_JOBS WHERE DEDUP_HASH = ?)`,
        [
          job.title,
          job.company,
          job.location,
          job.description,
          JSON.stringify(job.keywords),
          job.source,
          dedupHash,
          dedupHash,
        ]
      );
      console.log(`  ✓ Job: ${job.title} @ ${job.company}`);
      jobCount++;
    } catch (err) {
      console.error(`  ✗ Job: ${job.title} — ${(err as Error).message}`);
    }
  }

  console.log(`\n✅ Seeding complete: ${posCount} positions, ${jobCount} jobs`);

  await destroyConnection();
}

seed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
