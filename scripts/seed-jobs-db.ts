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
  {
    title: "Research Scientist - AI/ML",
    university: "IIT Jodhpur",
    department: "Computer Science and Engineering",
    location: "Jodhpur, India",
    description: "Research position in generative AI, LLMs, and multi-agent systems. Experience with LangChain, LlamaIndex preferred.",
    keywords: ["ai", "machine_learning", "llm", "langchain", "python", "research", "gen-ai"],
  },
  {
    title: "Assistant Professor - Data Engineering",
    university: "IIT Hyderabad",
    department: "Computer Science",
    location: "Hyderabad, India",
    description: "Focus on large-scale data processing, ETL pipelines, cloud data warehousing (Snowflake, Databricks).",
    keywords: ["data_engineering", "snowflake", "databricks", "python", "etl", "big_data"],
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
  // Data Engineering roles matching SAP/Snowflake/Databricks skills
  {
    title: "Senior Data Engineer",
    company: "Infosys",
    location: "Bangalore, India",
    description: "Design and build large-scale data pipelines using PySpark, Snowflake, and Airflow. Experience with SAP HANA and data integration tools (Informatica, BODS) preferred.",
    keywords: ["data_engineering", "snowflake", "pyspark", "airflow", "sap", "hana", "informatica", "python", "etl"],
    source: "sample_seed",
  },
  {
    title: "Data Engineer - SAP & Cloud",
    company: "TCS",
    location: "Mumbai, India",
    description: "Build data pipelines from SAP systems to cloud data warehouses. Experience with SAP BODS, SSIS, Azure Data Factory, and Snowflake required.",
    keywords: ["sap", "bods", "ssis", "azure", "data_engineering", "snowflake", "etl", "sql"],
    source: "sample_seed",
  },
  {
    title: "Lead Data Engineer - Snowflake",
    company: "Accenture",
    location: "Hyderabad, India",
    description: "Lead Snowflake-based data warehouse implementations. Design Snowpark solutions, build Streamlit dashboards, manage data pipelines with Airflow.",
    keywords: ["snowflake", "snowpark", "streamlit", "airflow", "python", "data_engineering", "sql", "etl"],
    source: "sample_seed",
  },
  {
    title: "AI/ML Engineer - Gen AI",
    company: "Wipro",
    location: "Bangalore, India",
    description: "Build generative AI applications using LangChain, LlamaIndex, and multi-agent frameworks. Experience with AutoGen and orchestration required.",
    keywords: ["ai", "gen-ai", "langchain", "llamaindex", "autogen", "python", "multi-agent", "orchestration", "llm"],
    source: "sample_seed",
  },
  {
    title: "Data Platform Engineer",
    company: "Amazon India",
    location: "Hyderabad, India",
    description: "Build and manage data platforms using Databricks, Apache Iceberg, and Kafka. Strong PySpark and Python skills needed.",
    keywords: ["databricks", "apache_iceberg", "kafka", "pyspark", "python", "data_engineering", "aws"],
    source: "sample_seed",
  },
  {
    title: "SAP Data Integration Specialist",
    company: "Deloitte India",
    location: "Pune, India",
    description: "Lead SAP data migration and integration projects. Expert in SAP BODS, LSMW, BAPI, IDOC, and data warehousing concepts.",
    keywords: ["sap", "bods", "lsmw", "bapi", "idoc", "data_integration", "informatica", "sql"],
    source: "sample_seed",
  },
  {
    title: "Azure Data Engineer",
    company: "Capgemini",
    location: "Mumbai, India",
    description: "Design data solutions on Azure. Experience with Azure Data Factory, Azure DB, SQL Server, and ETL pipelines.",
    keywords: ["azure", "data_engineering", "sql_server", "azure_data_factory", "etl", "python", "sql"],
    source: "sample_seed",
  },
  {
    title: "Data Engineering Lead",
    company: "Cognizant",
    location: "Chennai, India",
    description: "Lead a team building enterprise data lakes and warehouses using Snowflake, Databricks, and Kafka. Oracle and SAP HANA migration experience valued.",
    keywords: ["snowflake", "databricks", "kafka", "oracle", "sap", "hana", "data_engineering", "python", "sql"],
    source: "sample_seed",
  },
  {
    title: "AI Research Engineer",
    company: "Samsung R&D India",
    location: "Bangalore, India",
    description: "Research and develop AI models for edge devices. Work on RAG pipelines, multi-agent systems, and LLM fine-tuning.",
    keywords: ["ai", "research", "rag", "multi-agent", "llm", "python", "machine_learning", "deep_learning"],
    source: "sample_seed",
  },
  {
    title: "Senior Python Developer - Data & AI",
    company: "IBM India",
    location: "Bangalore, India",
    description: "Build data processing pipelines and AI applications using Python, Docker, and Git. Experience with Gemini and LangChain preferred.",
    keywords: ["python", "docker", "git", "ai", "langchain", "gemini", "data_engineering"],
    source: "sample_seed",
  },
  {
    title: "Data Warehouse Architect",
    company: "HCL Technologies",
    location: "Noida, India",
    description: "Architect enterprise data warehouses using Oracle, SQL Server, SAP HANA. Design ETL/ELT pipelines with Informatica and SSIS.",
    keywords: ["oracle", "sql_server", "sap", "hana", "informatica", "ssis", "data_engineering", "etl", "sql"],
    source: "sample_seed",
  },
  {
    title: "MLOps Engineer",
    company: "PhonePe",
    location: "Bangalore, India",
    description: "Build ML pipelines, model serving infrastructure, and monitoring. Experience with Docker, Kubernetes, and cloud platforms.",
    keywords: ["mlops", "docker", "kubernetes", "python", "machine_learning", "aws", "data_engineering"],
    source: "sample_seed",
  },
  {
    title: "Databricks Solutions Architect",
    company: "Databricks India",
    location: "Bangalore, India",
    description: "Help customers design and implement Databricks solutions. Deep expertise in PySpark, Delta Lake, and Apache Iceberg required.",
    keywords: ["databricks", "pyspark", "apache_iceberg", "python", "data_engineering", "spark", "sql"],
    source: "sample_seed",
  },
  {
    title: "GenAI Application Developer",
    company: "Tech Mahindra",
    location: "Pune, India",
    description: "Build enterprise GenAI applications using multi-agent frameworks, Streamlit, and orchestration tools. Python, LangChain, AutoGen experience needed.",
    keywords: ["gen-ai", "python", "streamlit", "langchain", "autogen", "multi-agent", "orchestration", "ai"],
    source: "sample_seed",
  },
  {
    title: "Cloud Data Engineer - Snowflake",
    company: "Fractal Analytics",
    location: "Mumbai, India",
    description: "Build cloud-native data pipelines on Snowflake. Design Snowpark transformations, Streamlit apps, and integrate with Kafka and Airflow.",
    keywords: ["snowflake", "snowpark", "streamlit", "kafka", "airflow", "python", "data_engineering", "sql"],
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
        `INSERT INTO CL_POSITIONS (TITLE, UNIVERSITY, DEPARTMENT, COUNTRY, DESCRIPTION, KEYWORDS, DEDUP_HASH)
         SELECT ?, ?, ?, ?, ?, PARSE_JSON(?), ?
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
