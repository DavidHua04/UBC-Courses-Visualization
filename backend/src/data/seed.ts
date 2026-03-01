import { sql } from "drizzle-orm";
import type { PrerequisiteRule } from "../models/types";

interface SeedCourse {
  id: string;
  dept: string;
  code: string;
  title: string;
  credits: string;
  description: string | null;
  prerequisites: PrerequisiteRule | null;
  corequisites: string[];
  termsOffered: string[];
}

const SEED_COURSES: SeedCourse[] = [
  // ─── Year 1 CPSC ───────────────────────────────────────────────
  {
    id: "CPSC110",
    dept: "CPSC",
    code: "110",
    title: "Computation, Programs, and Programming",
    credits: "4.0",
    description: "Fundamental program and computation structures using functional programming.",
    prerequisites: null,
    corequisites: [],
    termsOffered: ["W1", "W2", "S"],
  },
  {
    id: "CPSC107",
    dept: "CPSC",
    code: "107",
    title: "Systematic Program Design",
    credits: "3.0",
    description: "Systematic design of programs using functional programming.",
    prerequisites: null,
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  {
    id: "CPSC121",
    dept: "CPSC",
    code: "121",
    title: "Models of Computation",
    credits: "4.0",
    description: "Boolean algebra, combinational and sequential circuits, computability.",
    prerequisites: {
      type: "one_of",
      rules: [
        { type: "course", courseId: "CPSC110" },
        { type: "course", courseId: "CPSC107" },
      ],
    },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  // ─── Year 2 CPSC ───────────────────────────────────────────────
  {
    id: "CPSC210",
    dept: "CPSC",
    code: "210",
    title: "Software Construction",
    credits: "4.0",
    description: "Design and implementation of robust software components using Java.",
    prerequisites: { type: "course", courseId: "CPSC110" },
    corequisites: [],
    termsOffered: ["W1", "W2", "S"],
  },
  {
    id: "CPSC213",
    dept: "CPSC",
    code: "213",
    title: "Introduction to Computer Systems",
    credits: "4.0",
    description: "Hardware, OS, and software interaction; C and machine code.",
    prerequisites: {
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC121" },
        {
          type: "one_of",
          rules: [
            { type: "course", courseId: "CPSC110" },
            { type: "course", courseId: "CPSC107" },
          ],
        },
      ],
    },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  {
    id: "CPSC221",
    dept: "CPSC",
    code: "221",
    title: "Basic Algorithms and Data Structures",
    credits: "4.0",
    description: "Design and analysis of algorithms; fundamental data structures.",
    prerequisites: {
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC210" },
        { type: "course", courseId: "CPSC121" },
      ],
    },
    corequisites: [],
    termsOffered: ["W1", "W2", "S"],
  },
  // ─── Year 3 CPSC ───────────────────────────────────────────────
  {
    id: "CPSC310",
    dept: "CPSC",
    code: "310",
    title: "Introduction to Software Engineering",
    credits: "4.0",
    description: "Engineering methods for building reliable large-scale software.",
    prerequisites: {
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC210" },
        { type: "course", courseId: "CPSC221" },
      ],
    },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  {
    id: "CPSC313",
    dept: "CPSC",
    code: "313",
    title: "Computer Hardware and Operating Systems",
    credits: "3.0",
    description: "OS principles: processes, memory management, file systems.",
    prerequisites: {
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC213" },
        { type: "course", courseId: "CPSC221" },
      ],
    },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  {
    id: "CPSC320",
    dept: "CPSC",
    code: "320",
    title: "Intermediate Algorithm Design and Analysis",
    credits: "3.0",
    description: "Advanced algorithm design techniques; NP-completeness.",
    prerequisites: { type: "course", courseId: "CPSC221" },
    corequisites: [],
    termsOffered: ["W1", "W2", "S"],
  },
  {
    id: "CPSC322",
    dept: "CPSC",
    code: "322",
    title: "Introduction to Artificial Intelligence",
    credits: "3.0",
    description: "Search, constraint satisfaction, planning, machine learning basics.",
    prerequisites: { type: "course", courseId: "CPSC221" },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  {
    id: "CPSC330",
    dept: "CPSC",
    code: "330",
    title: "Applied Machine Learning",
    credits: "3.0",
    description: "Practical machine learning using Python and scikit-learn.",
    prerequisites: { type: "course", courseId: "CPSC221" },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  {
    id: "CPSC340",
    dept: "CPSC",
    code: "340",
    title: "Machine Learning and Data Mining",
    credits: "3.0",
    description: "Probabilistic models, linear algebra foundations, deep learning.",
    prerequisites: {
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC221" },
        {
          type: "one_of",
          rules: [
            { type: "course", courseId: "MATH200" },
            { type: "course", courseId: "MATH226" },
          ],
        },
        {
          type: "one_of",
          rules: [
            { type: "course", courseId: "MATH221" },
            { type: "course", courseId: "MATH223" },
          ],
        },
      ],
    },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  // ─── Year 4 CPSC ───────────────────────────────────────────────
  {
    id: "CPSC410",
    dept: "CPSC",
    code: "410",
    title: "Advanced Software Engineering",
    credits: "4.0",
    description: "Formal methods, model checking, and advanced SE techniques.",
    prerequisites: { type: "course", courseId: "CPSC310" },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  {
    id: "CPSC416",
    dept: "CPSC",
    code: "416",
    title: "Distributed Systems",
    credits: "3.0",
    description: "Concurrency, consistency, fault tolerance in distributed systems.",
    prerequisites: {
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC313" },
        { type: "course", courseId: "CPSC317" },
      ],
    },
    corequisites: [],
    termsOffered: ["W2"],
  },
  {
    id: "CPSC317",
    dept: "CPSC",
    code: "317",
    title: "Internet Computing",
    credits: "3.0",
    description: "Network protocols, TCP/IP, HTTP, DNS, security.",
    prerequisites: { type: "course", courseId: "CPSC213" },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  // ─── MATH ───────────────────────────────────────────────────────
  {
    id: "MATH100",
    dept: "MATH",
    code: "100",
    title: "Differential Calculus with Applications to Physical Sciences and Engineering",
    credits: "3.0",
    description: "Limits, derivatives, applications of differentiation.",
    prerequisites: null,
    corequisites: [],
    termsOffered: ["W1", "W2", "S"],
  },
  {
    id: "MATH101",
    dept: "MATH",
    code: "101",
    title: "Integral Calculus with Applications to Physical Sciences and Engineering",
    credits: "3.0",
    description: "Integration, fundamental theorem of calculus, series.",
    prerequisites: { type: "course", courseId: "MATH100" },
    corequisites: [],
    termsOffered: ["W1", "W2", "S"],
  },
  {
    id: "MATH200",
    dept: "MATH",
    code: "200",
    title: "Calculus III",
    credits: "3.0",
    description: "Multivariable calculus: partial derivatives, multiple integrals, vector calculus.",
    prerequisites: { type: "course", courseId: "MATH101" },
    corequisites: [],
    termsOffered: ["W1", "W2", "S"],
  },
  {
    id: "MATH220",
    dept: "MATH",
    code: "220",
    title: "Mathematical Proof",
    credits: "3.0",
    description: "Introduction to mathematical reasoning and proof techniques.",
    prerequisites: null,
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  {
    id: "MATH221",
    dept: "MATH",
    code: "221",
    title: "Matrix Algebra",
    credits: "3.0",
    description: "Vectors, matrices, linear systems, eigenvalues.",
    prerequisites: null,
    corequisites: [],
    termsOffered: ["W1", "W2", "S"],
  },
  {
    id: "MATH223",
    dept: "MATH",
    code: "223",
    title: "Linear Algebra",
    credits: "3.0",
    description: "Rigorous linear algebra; vector spaces, linear maps, spectral theorem.",
    prerequisites: { type: "course", courseId: "MATH221" },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  {
    id: "MATH226",
    dept: "MATH",
    code: "226",
    title: "Advanced Calculus I",
    credits: "3.0",
    description: "Rigorous introduction to real analysis in multiple variables.",
    prerequisites: { type: "course", courseId: "MATH200" },
    corequisites: [],
    termsOffered: ["W1"],
  },
  // ─── STAT ────────────────────────────────────────────────────────
  {
    id: "STAT200",
    dept: "STAT",
    code: "200",
    title: "Elementary Statistics for Applications",
    credits: "3.0",
    description: "Probability, sampling distributions, estimation, hypothesis testing.",
    prerequisites: null,
    corequisites: [],
    termsOffered: ["W1", "W2", "S"],
  },
  {
    id: "STAT302",
    dept: "STAT",
    code: "302",
    title: "Introduction to Probability",
    credits: "3.0",
    description: "Probability spaces, random variables, distributions, limit theorems.",
    prerequisites: { type: "course", courseId: "MATH101" },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  {
    id: "STAT305",
    dept: "STAT",
    code: "305",
    title: "Introduction to Statistical Inference",
    credits: "3.0",
    description: "Estimation, hypothesis testing, regression.",
    prerequisites: { type: "course", courseId: "STAT302" },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  // ─── CPSC electives ─────────────────────────────────────────────
  {
    id: "CPSC406",
    dept: "CPSC",
    code: "406",
    title: "Computational Optimization",
    credits: "3.0",
    description: "Continuous and combinatorial optimization methods.",
    prerequisites: {
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC221" },
        {
          type: "one_of",
          rules: [
            { type: "course", courseId: "MATH200" },
            { type: "course", courseId: "MATH226" },
          ],
        },
        {
          type: "one_of",
          rules: [
            { type: "course", courseId: "MATH221" },
            { type: "course", courseId: "MATH223" },
          ],
        },
      ],
    },
    corequisites: [],
    termsOffered: ["W2"],
  },
  {
    id: "CPSC421",
    dept: "CPSC",
    code: "421",
    title: "Introduction to Theory of Computing",
    credits: "3.0",
    description: "Automata, formal languages, computability, complexity.",
    prerequisites: {
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC221" },
        { type: "course", courseId: "MATH220" },
      ],
    },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
  {
    id: "CPSC425",
    dept: "CPSC",
    code: "425",
    title: "Computer Vision",
    credits: "3.0",
    description: "Image processing, feature extraction, object recognition.",
    prerequisites: {
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC221" },
        {
          type: "one_of",
          rules: [
            { type: "course", courseId: "MATH221" },
            { type: "course", courseId: "MATH223" },
          ],
        },
      ],
    },
    corequisites: [],
    termsOffered: ["W1"],
  },
  {
    id: "CPSC436D",
    dept: "CPSC",
    code: "436D",
    title: "Topics in Computer Science: Databases",
    credits: "3.0",
    description: "Relational databases, query optimization, transactions.",
    prerequisites: { type: "course", courseId: "CPSC221" },
    corequisites: [],
    termsOffered: ["W1", "W2"],
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runSeed(db: { execute: (query: any) => Promise<any> }): Promise<void> {
  console.log(`Seeding ${SEED_COURSES.length} courses...`);

  for (const course of SEED_COURSES) {
    await db.execute(
      sql`
        INSERT INTO courses (id, dept, code, title, credits, description, prerequisites, corequisites, terms_offered)
        VALUES (
          ${course.id},
          ${course.dept},
          ${course.code},
          ${course.title},
          ${course.credits},
          ${course.description},
          ${course.prerequisites ? JSON.stringify(course.prerequisites) : null}::jsonb,
          ${'{' + course.corequisites.join(',') + '}'}::text[],
          ${'{' + course.termsOffered.join(',') + '}'  }::text[]
        )
        ON CONFLICT (id) DO UPDATE SET
          dept = EXCLUDED.dept,
          code = EXCLUDED.code,
          title = EXCLUDED.title,
          credits = EXCLUDED.credits,
          description = EXCLUDED.description,
          prerequisites = EXCLUDED.prerequisites,
          corequisites = EXCLUDED.corequisites,
          terms_offered = EXCLUDED.terms_offered,
          updated_at = NOW()
      `
    );
  }

  console.log("Seed complete.");
}
