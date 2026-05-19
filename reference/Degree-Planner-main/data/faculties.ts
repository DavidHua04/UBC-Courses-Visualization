import { Degree, DegreeRequirement } from '@/types';

export interface Faculty {
  id: string;
  name: string;
  programs: Degree[];
  requirements?: DegreeRequirement[];
}

export const faculties: Faculty[] = [
  {
    id: 'science',
    name: 'Science',
    programs: [
      {
        id: 'computer-science',
        name: 'Major (0376): Computer Science',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: [
          {
            id: 'cpsc-110',
            name: 'CPSC 110 (or 103 and 107)',
            type: 'required',
            credits: 4,
            courses: ['CPSC 110', 'CPSC 103', 'CPSC 107'],
            description: 'CPSC 110 or both CPSC 103 and CPSC 107'
          },
      {
            id: 'cpsc-121',
            name: 'CPSC 121',
            type: 'required',
            credits: 4,
            courses: ['CPSC 121'],
            description: 'Models of Computation'
          },
      {
            id: 'math-100-level',
            name: 'One of MATH 100, 102, 104, 110, 120, 180, or 184',
            type: 'required',
            credits: 3,
            courses: ['MATH 100', 'MATH 102', 'MATH 104', 'MATH 110', 'MATH 120', 'MATH 180', 'MATH 184'],
            description: 'First year calculus'
          },
      {
            id: 'math-101-level',
            name: 'One of MATH 101, 103, 105, or 121',
            type: 'required',
            credits: 3,
            courses: ['MATH 101', 'MATH 103', 'MATH 105', 'MATH 121'],
            description: 'First year calculus continuation'
          },
      {
            id: 'cpsc-210',
            name: 'CPSC 210',
            type: 'required',
            credits: 4,
            courses: ['CPSC 210'],
            description: 'Software Construction'
          },
      {
            id: 'cpsc-213',
            name: 'CPSC 213',
            type: 'required',
            credits: 4,
            courses: ['CPSC 213'],
            description: 'Introduction to Computer Systems'
          },
      {
            id: 'cpsc-221',
            name: 'CPSC 221',
            type: 'required',
            credits: 4,
            courses: ['CPSC 221'],
            description: 'Basic Algorithms and Data Structures'
          },
      {
            id: 'math-200',
            name: 'MATH 200',
            type: 'required',
            credits: 3,
            courses: ['MATH 200'],
            description: 'Calculus III'
          },
      {
            id: 'math-221',
            name: 'MATH 221',
            type: 'required',
            credits: 3,
            courses: ['MATH 221'],
            description: 'Matrix Algebra'
          },
      {
            id: 'stat-241-251',
            name: 'STAT 241 or 251 (or STAT 200 or 201 and MATH/STAT 302)',
            type: 'required',
            credits: 3,
            courses: ['STAT 241', 'STAT 251', 'STAT 200', 'STAT 201', 'MATH 302', 'STAT 302'],
            description: 'Statistics requirement'
          },
      {
            id: 'cpsc-310',
            name: 'CPSC 310',
            type: 'required',
            credits: 4,
            courses: ['CPSC 310'],
            description: 'Introduction to Software Engineering'
          },
      {
            id: 'cpsc-320',
            name: 'CPSC 320',
            type: 'required',
            credits: 3,
            courses: ['CPSC 320'],
            description: 'Intermediate Algorithm Design and Analysis'
          },
      {
            id: 'cpsc-300-level',
            name: '9 Credits of CPSC Courses Numbered 300 or Higher',
            type: 'required',
            credits: 9,
            courses: [],
            description: '9 credits from CPSC courses at 300-level or higher'
          },
      {
            id: 'cpsc-400-level',
            name: '6 Credits of 400 Level CPSC Courses',
            type: 'required',
            credits: 6,
            courses: [],
            description: '6 credits from CPSC courses at 400-level'
          },
      {
            id: 'cpsc-400-lecture',
            name: '3 Credits of 400 Level CPSC Lecture Based Courses',
            type: 'required',
            credits: 3,
            courses: [],
            description: '3 credits from 400-level CPSC lecture-based courses'
          }
        ]
      },
      {
        id: 'major',
        name: 'Major',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_0001_geophysics',
        name: 'Major (0001): Geophysics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_0030_astronomy_astr',
        name: 'Major (0030): Astronomy (ASTR)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_0167_atmospheric_science_atsc',
        name: 'Major (0167): Atmospheric Science (ATSC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_0185_mathematical_sciences_masc',
        name: 'Major (0185): Mathematical Sciences (MASC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_0244_biochemistry_bioc_v',
        name: 'Major (0244): Biochemistry (BIOC_V)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_0311_pharmacology_pcth',
        name: 'Major (0311): Pharmacology (PCTH)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_0376_computer_science_cpsc',
        name: 'Major (0376): Computer Science (CPSC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: [
          {
            id: 'cpsc-110',
            name: 'CPSC 110 (or 103 and 107)',
            type: 'required',
            credits: 4,
            courses: ['CPSC 110', 'CPSC 103', 'CPSC 107'],
            description: 'CPSC 110 or both CPSC 103 and CPSC 107'
          },
          {
            id: 'cpsc-121',
            name: 'CPSC 121',
            type: 'required',
            credits: 4,
            courses: ['CPSC 121'],
            description: 'Models of Computation'
          },
          {
            id: 'math-100-level',
            name: 'One of MATH 100, 102, 104, 110, 120, 180, or 184',
            type: 'required',
            credits: 3,
            courses: ['MATH 100', 'MATH 102', 'MATH 104', 'MATH 110', 'MATH 120', 'MATH 180', 'MATH 184'],
            description: 'First year calculus'
          },
          {
            id: 'math-101-level',
            name: 'One of MATH 101, 103, 105, or 121',
            type: 'required',
            credits: 3,
            courses: ['MATH 101', 'MATH 103', 'MATH 105', 'MATH 121'],
            description: 'First year calculus continuation'
          },
          {
            id: 'cpsc-210',
            name: 'CPSC 210',
            type: 'required',
            credits: 4,
            courses: ['CPSC 210'],
            description: 'Software Construction'
          },
          {
            id: 'cpsc-213',
            name: 'CPSC 213',
            type: 'required',
            credits: 4,
            courses: ['CPSC 213'],
            description: 'Introduction to Computer Systems'
          },
          {
            id: 'cpsc-221',
            name: 'CPSC 221',
            type: 'required',
            credits: 4,
            courses: ['CPSC 221'],
            description: 'Basic Algorithms and Data Structures'
          },
          {
            id: 'math-200',
            name: 'MATH 200',
            type: 'required',
            credits: 3,
            courses: ['MATH 200'],
            description: 'Calculus III'
          },
          {
            id: 'math-221',
            name: 'MATH 221',
            type: 'required',
            credits: 3,
            courses: ['MATH 221'],
            description: 'Matrix Algebra'
          },
          {
            id: 'stat-241-251',
            name: 'STAT 241 or 251 (or STAT 200 or 201 and MATH/STAT 302)',
            type: 'required',
            credits: 3,
            courses: ['STAT 241', 'STAT 251', 'STAT 200', 'STAT 201', 'MATH 302', 'STAT 302'],
            description: 'Statistics requirement'
          },
          {
            id: 'cpsc-310',
            name: 'CPSC 310',
            type: 'required',
            credits: 4,
            courses: ['CPSC 310'],
            description: 'Introduction to Software Engineering'
          },
          {
            id: 'cpsc-320',
            name: 'CPSC 320',
            type: 'required',
            credits: 3,
            courses: ['CPSC 320'],
            description: 'Intermediate Algorithm Design and Analysis'
          },
          {
            id: 'cpsc-300-level',
            name: '9 Credits of CPSC Courses Numbered 300 or Higher',
            type: 'required',
            credits: 9,
            courses: [],
            description: '9 credits from CPSC courses at 300-level or higher'
          },
          {
            id: 'cpsc-400-level',
            name: '6 Credits of 400 Level CPSC Courses',
            type: 'required',
            credits: 6,
            courses: [],
            description: '6 credits from CPSC courses at 400-level'
          },
          {
            id: 'cpsc-400-lecture',
            name: '3 Credits of 400 Level CPSC Lecture Based Courses',
            type: 'required',
            credits: 3,
            courses: [],
            description: '3 credits from 400-level CPSC lecture-based courses'
          }
        ]
      },
      {
        id: 'major_0409_chemistry_chem',
        name: 'Major (0409): Chemistry (CHEM)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_0456_mathematics_math',
        name: 'Major (0456): Mathematics (MATH)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_0524_physics_phys',
        name: 'Major (0524): Physics (PHYS)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_0562_statistics_stat',
        name: 'Major (0562): Statistics (STAT)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_1153_microbiology_and_immunology',
        name: 'Major (1153): Microbiology and Immunology',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_1200_computer_science_and_software_engineering',
        name: 'Major (1200): Computer Science and Software Engineering',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_1223_earth_and_ocean_sciences',
        name: 'Major (1223): Earth and Ocean Sciences',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_1263_environmental_sciences_ensc',
        name: 'Major (1263): Environmental Sciences (ENSC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_1682_integrated_sciences_insc',
        name: 'Major (1682): Integrated Sciences (INSC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_3095_biology_biol',
        name: 'Major (3095): Biology (BIOL)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_3193_geology',
        name: 'Major (3193): Geology',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_3428_geographical_sciences_geos',
        name: 'Major (3428): Geographical Sciences (GEOS)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_3502_behavioural_neuroscience_psyc',
        name: 'Major (3502): Behavioural Neuroscience (PSYC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_3742_neuroscience_nsci',
        name: 'Major (3742): Neuroscience (NSCI)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_3992_cellular_anatomical_and_physiological_sciences_caps',
        name: 'Major (3992): Cellular, Anatomical and Physiological Sciences (CAPS)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_cognitive_systems_1225_cognition_and_brain',
        name: 'Major Cognitive Systems (1225): Cognition and Brain',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'mathematical_sciences',
        name: 'Major in Mathematical Sciences',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_data_science_dsci',
        name: 'Major: Data Science (DSCI)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'majors_areas_of_concentration_required_courses',
        name: 'Majors Areas of Concentration Required Courses',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours',
        name: 'Honours',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_001511_integrated_sciences',
        name: 'Honours (001511): Integrated Sciences',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0019_pharmacology_pcth',
        name: 'Honours (0019): Pharmacology (PCTH)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0045_ecology_ecol',
        name: 'Honours (0045): Ecology (ECOL)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0051_statistics_stat',
        name: 'Honours (0051): Statistics (STAT)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0054_animal_biology_anim',
        name: 'Honours (0054): Animal Biology (ANIM)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0154_computer_science_cpsc',
        name: 'Honours (0154): Computer Science (CPSC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0166_mathematics_math',
        name: 'Honours (0166): Mathematics (MATH)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0186_biochemistry_bioc',
        name: 'Honours (0186): Biochemistry (BIOC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0213_chemistry_chem',
        name: 'Honours (0213): Chemistry (CHEM)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0344_physics_phys',
        name: 'Honours (0344): Physics (PHYS)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0372_plant_biology_ptlb',
        name: 'Honours (0372): Plant Biology (PTLB)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0380_geophysics_geop_1',
        name: 'Honours (0380): Geophysics (GEOP) 1',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0405_cell_and_developmental_biology_cell',
        name: 'Honours (0405): Cell and Developmental Biology (CELL)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0429_atmospheric_science_atsc',
        name: 'Honours (0429): Atmospheric Science (ATSC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0462_geological_sciences',
        name: 'Honours (0462): Geological Sciences',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0518_marine_biology_mrnb',
        name: 'Honours (0518): Marine Biology (MRNB)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0577_fisheries_oceanography',
        name: 'Honours (0577): Fisheries Oceanography',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0583_conservation_biology_cons',
        name: 'Honours (0583): Conservation Biology (CONS)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0589_environmental_sciences_ensc',
        name: 'Honours (0589): Environmental Sciences (ENSC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_0983_evolutionary_biology_evol',
        name: 'Honours (0983): Evolutionary Biology (EVOL)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_1136_biotechnology',
        name: 'Honours (1136): Biotechnology',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_1154_microbiology_and_immunology_mbim',
        name: 'Honours (1154): Microbiology and Immunology (MBIM)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_1201_computer_science_and_software_engineering',
        name: 'Honours (1201): Computer Science and Software Engineering',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_3194_biology_biol',
        name: 'Honours (3194): Biology (BIOL)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_3221_cellular_anatomical_and_physiological_sciences_caps',
        name: 'Honours (3221): Cellular, Anatomical and Physiological Sciences (CAPS)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_3503_behavioural_neuroscience_psyc',
        name: 'Honours (3503): Behavioural Neuroscience (PSYC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'honours_areas_of_concentration_required_courses',
        name: 'Honours Areas of Concentration Required Courses',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'major_0376_and_honours_0154_computer_science_cpsc',
        name: 'Major (0376) and Honours (0154): Computer Science (CPSC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_1135_mathematics_and_economics_math_econ',
        name: 'Combined Major (1135): Mathematics and Economics (MATH, ECON)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_1330_statistics_and_economics',
        name: 'Combined Major (1330): Statistics and Economics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_1370_computer_science_and_biology',
        name: 'Combined Major (1370): Computer Science and Biology',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_1371_computer_science_microbiology_and_immunology',
        name: 'Combined Major (1371): Computer Science & Microbiology and Immunology',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_1375_computer_science_and_statistics',
        name: 'Combined Major (1375): Computer Science and Statistics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_1391_computer_science_and_physics',
        name: 'Combined Major (1391): Computer Science and Physics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_1429_computer_science_and_mathematics',
        name: 'Combined Major (1429): Computer Science and Mathematics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_3096_science',
        name: 'Combined Major (3096): Science',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_3125_oceanography_and_biology',
        name: 'Combined Major (3125): Oceanography and Biology',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_3126_oceanography_and_physics',
        name: 'Combined Major (3126): Oceanography and Physics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_3144_microbiology_and_oceanography',
        name: 'Combined Major (3144): Microbiology and Oceanography',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_3340_chemical_biology',
        name: 'Combined Major (3340): Chemical Biology',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_3340_chemical_biology_chem_biol',
        name: 'Combined Major (3340): Chemical Biology (CHEM, BIOL)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_3382_biochemistry_and_chemistry',
        name: 'Combined Major (3382): Biochemistry and Chemistry',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_3382_biochemistry_and_chemistry_bioc_chem',
        name: 'Combined Major (3382): Biochemistry and Chemistry (BIOC, CHEM)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_3383_oceanography_and_chemistry',
        name: 'Combined Major (3383): Oceanography and Chemistry',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_3401_computer_science_and_chemistry',
        name: 'Combined Major (3401): Computer Science and Chemistry',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_3401_computer_science_and_chemistry_cpsc_chem',
        name: 'Combined Major (3401): Computer Science and Chemistry (CPSC, CHEM)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_specializations',
        name: 'Combined Major Specializations',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_major_computer_science_and_another_science_subject',
        name: 'Combined Major: Computer Science and Another Science Subject',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0009_physics_and_astronomy_phys_astr',
        name: 'Combined Honours (0009): Physics and Astronomy (PHYS, ASTR)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0014_physics_and_mathematics',
        name: 'Combined Honours (0014): Physics and Mathematics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0014_physics_and_mathematics_phys_math',
        name: 'Combined Honours (0014): Physics and Mathematics (PHYS, MATH)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0021_computer_science_and_mathematics',
        name: 'Combined Honours (0021): Computer Science and Mathematics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0021_computer_science_and_mathematics_cpsc_math',
        name: 'Combined Honours (0021): Computer Science and Mathematics (CPSC, MATH)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0138_computer_science_and_physics',
        name: 'Combined Honours (0138): Computer Science and Physics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0138_computer_science_and_physics_cpsc_phys',
        name: 'Combined Honours (0138): Computer Science and Physics (CPSC, PHYS)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0206_chemistry_and_mathematics',
        name: 'Combined Honours (0206): Chemistry and Mathematics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0206_chemistry_and_mathematics_chem_math',
        name: 'Combined Honours (0206): Chemistry and Mathematics (CHEM, MATH)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0517_chemical_physics_phys_chem',
        name: 'Combined Honours (0517): Chemical Physics (PHYS, CHEM)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0535_oceanography_and_biology',
        name: 'Combined Honours (0535): Oceanography and Biology',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0535_oceanography_and_biology_ocgy_biol',
        name: 'Combined Honours (0535): Oceanography and Biology (OCGY, BIOL)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0550_mathematics_and_statistics',
        name: 'Combined Honours (0550): Mathematics and Statistics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0550_mathematics_and_statistics_math_stat',
        name: 'Combined Honours (0550): Mathematics and Statistics (MATH, STAT)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_0565_biochemistry_and_chemistry_bioc_chem',
        name: 'Combined Honours (0565): Biochemistry and Chemistry (BIOC, CHEM)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_1372_atmospheric_science_and_computer_science',
        name: 'Combined Honours (1372): Atmospheric Science and Computer Science',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_1372_atmospheric_science_and_computer_science_atsc_cpsc',
        name: 'Combined Honours (1372): Atmospheric Science and Computer Science (ATSC, CPSC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_1373_computer_science_microbiology_and_immunology',
        name: 'Combined Honours (1373): Computer Science & Microbiology and Immunology',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_1376_computer_science_and_statistics_cpsc_stat',
        name: 'Combined Honours (1376): Computer Science and Statistics (CPSC, STAT)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_1460_computer_science_and_biology',
        name: 'Combined Honours (1460): Computer Science and Biology',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_3132_chemical_biology',
        name: 'Combined Honours (3132): Chemical Biology',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_3132_chemical_biology_chem_biol',
        name: 'Combined Honours (3132): Chemical Biology (CHEM, BIOL)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_3508_biochemistry_and_forensic_science',
        name: 'Combined Honours (3508): Biochemistry and Forensic Science',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_3676_biophysics_biop',
        name: 'Combined Honours (3676): Biophysics (BIOP)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_in_biochemistry_and_chemistry',
        name: 'Combined Honours in Biochemistry and Chemistry',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_in_chemical_physics',
        name: 'Combined Honours in Chemical Physics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_in_physics_and_astronomy',
        name: 'Combined Honours in Physics and Astronomy',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_specializations',
        name: 'Combined Honours Specializations',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_chemistry_and_another_science_subject',
        name: 'Combined Honours: Chemistry and Another Science Subject',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_computer_science_and_statistics',
        name: 'Combined Honours: Computer Science and Statistics',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_geology_and_another_subject_geol',
        name: 'Combined Honours: Geology and Another Subject (GEOL)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_geophysics_and_another_science_subject_1',
        name: 'Combined Honours: Geophysics and Another Science Subject 1',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_mathematics_math_with_another_subject',
        name: 'Combined Honours: Mathematics (MATH) with Another Subject',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_oceanography_and_another_science_subject_1',
        name: 'Combined Honours: Oceanography and Another Science Subject 1',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'combined_honours_physics_and_another_science_subject_1',
        name: 'Combined Honours: Physics and Another Science Subject 1',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'minor_1184_biochemistry_bioc',
        name: 'Minor (1184): Biochemistry (BIOC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'minor_1186_chemistry_chem',
        name: 'Minor (1186): Chemistry (CHEM)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'minor_1193_oceanography_ocgy',
        name: 'Minor (1193): Oceanography (OCGY)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'minor_1195_physics_phys',
        name: 'Minor (1195): Physics (PHYS)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'minor_3085_environmental_sciences_ensc',
        name: 'Minor (3085): Environmental Sciences (ENSC)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'minor_3192_astronomy_astr',
        name: 'Minor (3192): Astronomy (ASTR)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'arts',
        name: 'Minor in Arts',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'commerce',
        name: 'Minor in Commerce',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'data_science',
        name: 'Minor in Data Science',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'kinesiology',
        name: 'Minor in Kinesiology',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'land_and_food_systems',
        name: 'Minor in Land and Food Systems',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'science',
        name: 'Minor in Science',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'minor_geophysics_geop',
        name: 'Minor: Geophysics (GEOP)',
        faculty: 'Science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
    ],
    requirements: [
      {
        id: 'upper-level-credits',
        name: '48 Upper Level Credits',
        type: 'required',
        credits: 48,
        courses: [],
        description: '48 credits at the 300-400 level'
      },
      {
        id: 'science-credits',
        name: '72 Science Credits',
        type: 'required',
        credits: 72,
        courses: [],
        description: '72 credits in Science courses'
      },
      {
        id: 'upper-level-science',
        name: '30 Upper Level Science Credits',
        type: 'required',
        credits: 30,
        courses: [],
        description: '30 credits in upper-level Science courses'
      },
      {
        id: 'arts-requirement',
        name: '12 Credits Arts Requirement',
        type: 'breadth',
        credits: 12,
        courses: [],
        description: '12 credits in Arts courses'
      },
      {
        id: 'science-breadth',
        name: 'Science Breadth Requirement',
        type: 'breadth',
        credits: 0,
        courses: [],
        description: 'Science breadth requirement - must satisfy at least 6 of 7 categories: Mathematics (all MATH_V courses except MATH_V 302), Chemistry (all CHEM_V courses except CHEM_V 100, CHEM_V 300), Physics (all PHYS_V courses except PHYS_V 100), Life Science (all BIOL_V courses except BIOL_V 140, BIOL_V 300; all BIOC_V, PSYC_V courses numbered 60-89, and MICB_V courses and GEOS_V/GEOB_V 207), Statistics (BIOL_V 300, DSCI_V 100, MATH_V 302, all STAT_V courses), Computer Science (all CPSC_V courses), Earth & Planetary Science (all ASTR_V, ATSC_V, ENVR_V, EOSC_V, GEOS_V/GEOB_V courses except EOSC_V 111 and GEOS_V/GEOB_V 207)'
      },
      {
        id: 'communication-scie113',
        name: 'Communication Requirement - SCIE 113',
        type: 'required',
        credits: 3,
        courses: ['SCIE 113'],
        description: 'Communication requirement'
      },
      {
        id: 'additional-communication',
        name: 'Additional Communication Requirement',
        type: 'required',
        credits: 3,
        courses: ['WRDS 150', 'ENGL 110', 'ENGL 111', 'SCIE 300', 'CHEM 300', 'ENVR 200', 'ARTS 001', 'ASTU 100', 'ENGL 100'],
        description: '3 credits from approved communication courses: WRDS 150, ENGL 110 or 111, SCIE 300, CHEM 300, ENVR 200, ARTS 001, ASTU 100, or ENGL 100'
      },
      {
        id: 'laboratory-science',
        name: 'Laboratory Science Requirement',
        type: 'required',
        credits: 0,
        courses: ['ASTR 101', 'ASTR 102', 'BIOL 140', 'CHEM 111', 'CHEM 115', 'CHEM 121', 'CHEM 123', 'CHEM 135', 'EOSC 111', 'PHYS 101', 'PHYS 107', 'PHYS 109', 'PHYS 119', 'PHYS 159', 'SCIE 001'],
        description: 'One course from approved laboratory science courses: ASTR 101, ASTR 102, BIOL 140, CHEM 111, CHEM 115, CHEM 121, CHEM 123, CHEM 135, EOSC 111, PHYS 101, PHYS 107, PHYS 109, PHYS 119, PHYS 159, or SCIE 001'
      },
      {
        id: 'foundational-biology',
        name: 'Foundational Requirement - Biology',
        type: 'required',
        credits: 3,
        courses: ['BIOL 111', 'BIOL 112', 'BIOL 121', 'BIOL 140'],
        description: '3 credits of 100-level BIOL (usually BIOL 111). Required for students without Biology 11 or 12 credit.'
      },
      {
        id: 'foundational-chemistry',
        name: 'Foundational Requirement - Chemistry',
        type: 'required',
        credits: 3,
        courses: ['CHEM 100', 'CHEM 110', 'CHEM 111', 'CHEM 115', 'CHEM 121', 'CHEM 123', 'CHEM 135'],
        description: '3 credits of 100-level CHEM (usually CHEM 100, CHEM 110 or CHEM 111). Required for students without Chemistry 12 credit.'
      },
      {
        id: 'foundational-physics',
        name: 'Foundation Requirement - Physics',
        type: 'required',
        credits: 3,
        courses: ['PHYS 100', 'PHYS 101', 'PHYS 106', 'PHYS 107', 'PHYS 108', 'PHYS 109', 'PHYS 117', 'PHYS 118', 'PHYS 119', 'PHYS 131', 'PHYS 153', 'PHYS 157', 'PHYS 158', 'PHYS 159'],
        description: '3 credits of 100-level PHYS (usually PHYS 100). Required for students without Physics 12 credit.'
      }
    ]
  },
  {
    id: 'arts',
    name: 'Arts',
    programs: [
      {
        id: 'economics',
        name: 'Economics',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'major_and_minor_in_visual_art',
        name: 'Major and Minor in Visual Art',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'ancient_mediterranean_and_near_eastern_studies',
        name: 'Major in Ancient Mediterranean and Near Eastern Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'anthropology',
        name: 'Major in Anthropology',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'art_history',
        name: 'Major in Art History',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_area_studies',
        name: 'Major in Asian Area Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_language_and_culture',
        name: 'Major in Asian Language and Culture',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_language_and_culture_area_of_focus_china',
        name: 'Major in Asian Language and Culture - Area of Focus: China',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_language_and_culture_area_of_focus_chinese_literature',
        name: 'Major in Asian Language and Culture - Area of Focus: Chinese Literature',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_language_and_culture_area_of_focus_japan',
        name: 'Major in Asian Language and Culture - Area of Focus: Japan',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_language_and_culture_area_of_focus_korea',
        name: 'Major in Asian Language and Culture - Area of Focus: Korea',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_language_and_culture_area_of_focus_south_asian_languages',
        name: 'Major in Asian Language and Culture - Area of Focus: South Asian Languages',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'canadian_studies',
        name: 'Major in Canadian Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'cinema_studies',
        name: 'Major in Cinema Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'cognitive_systems_cognition_and_the_brain',
        name: 'Major in Cognitive Systems: Cognition and the Brain',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'cognitive_systems_language_b_a',
        name: 'Major in Cognitive Systems: Language (B.A.)',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'cognitive_systems_mind_language_and_computation',
        name: 'Major in Cognitive Systems: Mind, Language, and Computation',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'computer_science',
        name: 'Major in Computer Science',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'creative_writing',
        name: 'Major in Creative Writing',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'english_language_and_literature_emphasis',
        name: 'Major in English: Language and Literature Emphasis',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'english_language_emphasis',
        name: 'Major in English: Language Emphasis',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'english_literature_emphasis',
        name: 'Major in English: Literature Emphasis',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'environment_and_sustainability',
        name: 'Major in Environment and Sustainability',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'environment_and_sustainability',
        name: 'Major in Environment and Sustainability',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'first_nations_and_endangered_languages',
        name: 'Major in First Nations and Endangered Languages',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'first_nations_and_indigenous_studies',
        name: 'Major in First Nations and Indigenous Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'french_language_literatures_and_cultures',
        name: 'Major in French Language, Literatures and Cultures',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'gender_race_sexuality_and_social_justice',
        name: 'Major in Gender, Race, Sexuality and Social Justice',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'german_studies',
        name: 'Major in German Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'history',
        name: 'Major in History',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'history_and_philosophy_of_science',
        name: 'Major in History and Philosophy of Science',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'history_and_philosophy_of_science',
        name: 'Major in History and Philosophy of Science',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'human_geography',
        name: 'Major in Human Geography',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'human_geography',
        name: 'Major in Human Geography',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'international_relations',
        name: 'Major in International Relations',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'italian',
        name: 'Major in Italian',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'latin_american_studies',
        name: 'Major in Latin American Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'linguistics',
        name: 'Major in Linguistics',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'mathematics',
        name: 'Major in Mathematics',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'medieval_studies',
        name: 'Major in Medieval Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'modern_european_studies',
        name: 'Major in Modern European Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'music',
        name: 'Major in Music',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'philosophy',
        name: 'Major in Philosophy',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'political_science',
        name: 'Major in Political Science',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'political_science',
        name: 'Major in Political Science',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'political_science_area_of_focus_politics_policy_and_administration',
        name: 'Major in Political Science - Area of Focus: Politics, Policy and Administration',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'psychology',
        name: 'Major in Psychology',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'romance_studies',
        name: 'Major in Romance Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'sociology',
        name: 'Major in Sociology',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'spanish',
        name: 'Major in Spanish',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'speech_sciences',
        name: 'Major in Speech Sciences',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'the_study_of_religion',
        name: 'Major in the Study of Religion',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'theatre',
        name: 'Major in Theatre',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'united_states_studies',
        name: 'Major in United States Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'urban_studies',
        name: 'Major in Urban Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'visual_art',
        name: 'Major in Visual Art',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'honours_and_awards_at_graduation',
        name: 'Honours and Awards at Graduation',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'honours_and_awards_at_graduation',
        name: 'Honours and Awards at Graduation',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'honours_and_awards_at_graduation',
        name: 'Honours and Awards at Graduation',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'ancient_mediterranean_and_near_eastern_studies',
        name: 'Honours in Ancient Mediterranean and Near Eastern Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'anthropology',
        name: 'Honours in Anthropology',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'art_history',
        name: 'Honours in Art History',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_area_studies',
        name: 'Honours in Asian Area Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_language_and_culture_area_of_focus_china',
        name: 'Honours in Asian Language and Culture - Area of Focus: China',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_language_and_culture_area_of_focus_chinese_literature',
        name: 'Honours in Asian Language and Culture - Area of Focus: Chinese Literature',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_language_and_culture_area_of_focus_japan',
        name: 'Honours in Asian Language and Culture - Area of Focus: Japan',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_language_and_culture_area_of_focus_korea',
        name: 'Honours in Asian Language and Culture - Area of Focus: Korea',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_language_and_culture_area_of_focus_south_asian_languages',
        name: 'Honours in Asian Language and Culture - Area of Focus: South Asian Languages',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'cinema_studies',
        name: 'Honours in Cinema Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'computer_science',
        name: 'Honours in Computer Science',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'english_language_and_literature_emphasis',
        name: 'Honours in English: Language and Literature Emphasis',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'english_literature_emphasis',
        name: 'Honours in English: Literature Emphasis',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'french_language_literatures_and_cultures',
        name: 'Honours in French Language, Literatures and Cultures',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'german_studies',
        name: 'Honours in German Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'history',
        name: 'Honours in History',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'history_with_international_relations',
        name: 'Honours in History with International Relations',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'human_geography',
        name: 'Honours in Human Geography',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'human_geography',
        name: 'Honours in Human Geography',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'international_relations',
        name: 'Honours in International Relations',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'linguistics',
        name: 'Honours in Linguistics',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'mathematics',
        name: 'Honours in Mathematics',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'music',
        name: 'Honours in Music',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'philosophy',
        name: 'Honours in Philosophy',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'political_science_with_international_relations',
        name: 'Honours in Political Science with International Relations',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'psychology',
        name: 'Honours in Psychology',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'romance_studies',
        name: 'Honours in Romance Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'sociology',
        name: 'Honours in Sociology',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'speech_sciences',
        name: 'Honours in Speech Sciences',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'the_study_of_religion',
        name: 'Honours in the Study of Religion',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'theatre',
        name: 'Honours in Theatre',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'major_or_honours_programs',
        name: 'Major or Honours Programs',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'major_honours_and_minor_in_german_studies',
        name: 'Major, Honours, and Minor in German Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'combined_major_in_economics_and_mathematics',
        name: 'Combined Major in Economics and Mathematics',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'combined_major_in_philosophy_and_economics',
        name: 'Combined Major in Philosophy and Economics',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'combined_major_in_philosophy_and_political_science',
        name: 'Combined Major in Philosophy and Political Science',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'combined_major_in_political_science_and_economics',
        name: 'Combined Major in Political Science and Economics',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'combined_major_in_political_science_and_philosophy',
        name: 'Combined Major in Political Science and Philosophy',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'combined_major_program',
        name: 'Combined Major Program',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'combined_honours_in_mathematics_and_another_subject',
        name: 'Combined Honours in Mathematics and Another Subject',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'combined_honours_in_mathematics_and_philosophy',
        name: 'Combined Honours in Mathematics and Philosophy',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'combined_honours_in_mathematics_and_philosophy',
        name: 'Combined Honours in Mathematics and Philosophy',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'african_studies',
        name: 'Minor in African Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'ancient_mediterranean_and_near_eastern_studies',
        name: 'Minor in Ancient Mediterranean and Near Eastern Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'anthropological_archaeology',
        name: 'Minor in Anthropological Archaeology',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'anthropology',
        name: 'Minor in Anthropology',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'applied_music_technology',
        name: 'Minor in Applied Music Technology',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'art_history',
        name: 'Minor in Art History',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_area_studies',
        name: 'Minor in Asian Area Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_canadian_and_asian_migration_studies',
        name: 'Minor in Asian Canadian and Asian Migration Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'asian_language_and_culture',
        name: 'Minor in Asian Language and Culture',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'canadian_studies',
        name: 'Minor in Canadian Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'cinema_studies',
        name: 'Minor in Cinema Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'commerce',
        name: 'Minor in Commerce',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'commerce',
        name: 'Minor in Commerce',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'commerce',
        name: 'Minor in Commerce',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'computer_science',
        name: 'Minor in Computer Science',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'creative_writing',
        name: 'Minor in Creative Writing',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'critical_studies_in_sexuality',
        name: 'Minor in Critical Studies in Sexuality',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'education',
        name: 'Minor in Education',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'education',
        name: 'Minor in Education',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'education',
        name: 'Minor in Education',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'english_language_emphasis',
        name: 'Minor in English: Language Emphasis',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'english_literature_emphasis',
        name: 'Minor in English: Literature Emphasis',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'english_teacher_education_preparation',
        name: 'Minor in English: Teacher Education Preparation',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'environment_and_society',
        name: 'Minor in Environment and Society',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'environment_and_sustainability',
        name: 'Minor in Environment and Sustainability',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'environment_and_sustainability',
        name: 'Minor in Environment and Sustainability',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'family_studies',
        name: 'Minor in Family Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'first_nations_and_endangered_languages',
        name: 'Minor in First Nations and Endangered Languages',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'first_nations_and_indigenous_studies',
        name: 'Minor in First Nations and Indigenous Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'french_language',
        name: 'Minor in French Language',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'french_language_literatures_and_cultures',
        name: 'Minor in French Language, Literatures and Cultures',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'gender_race_sexuality_and_social_justice',
        name: 'Minor in Gender, Race, Sexuality and Social Justice',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'geographic_information_science_and_geographical_computation_gis_gc',
        name: 'Minor in Geographic Information Science and Geographical Computation (GIS&GC)',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'geographic_information_science_and_geographical_computation_gis_gc',
        name: 'Minor in Geographic Information Science and Geographical Computation (GIS&GC)',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'german_studies',
        name: 'Minor in German Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'german_studies_anglophone',
        name: 'Minor in German Studies (Anglophone)',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'health_and_society',
        name: 'Minor in Health and Society',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'history',
        name: 'Minor in History',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'human_geography',
        name: 'Minor in Human Geography',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'human_geography',
        name: 'Minor in Human Geography',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'informatics',
        name: 'Minor in Informatics',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'international_relations',
        name: 'Minor in International Relations',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'italian',
        name: 'Minor in Italian',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'jewish_studies',
        name: 'Minor in Jewish Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'journalism_and_social_change',
        name: 'Minor in Journalism and Social Change',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'land_and_food_systems',
        name: 'Minor in Land and Food Systems',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'land_and_food_systems',
        name: 'Minor in Land and Food Systems',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'land_and_food_systems',
        name: 'Minor in Land and Food Systems',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'latin_american_studies',
        name: 'Minor in Latin American Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'law_and_society',
        name: 'Minor in Law and Society',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'linguistics',
        name: 'Minor in Linguistics',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'medieval_studies',
        name: 'Minor in Medieval Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'middle_east_studies',
        name: 'Minor in Middle East Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'music',
        name: 'Minor in Music',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'nordic_studies',
        name: 'Minor in Nordic Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'nordic_studies',
        name: 'Minor in Nordic Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'philosophy',
        name: 'Minor in Philosophy',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'political_science',
        name: 'Minor in Political Science',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'psychology_b_a',
        name: 'Minor in Psychology (B.A.)',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'romance_studies',
        name: 'Minor in Romance Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'russian',
        name: 'Minor in Russian',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'science',
        name: 'Minor in Science',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'science',
        name: 'Minor in Science',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'science',
        name: 'Minor in Science',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'slavic_and_eastern_european_studies',
        name: 'Minor in Slavic and Eastern European Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'sociology',
        name: 'Minor in Sociology',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'spanish',
        name: 'Minor in Spanish',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'speech_sciences',
        name: 'Minor in Speech Sciences',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'the_faculty_of_arts',
        name: 'Minor in the Faculty of Arts',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'the_study_of_religion',
        name: 'Minor in the Study of Religion',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'theatre',
        name: 'Minor in Theatre',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'united_states_studies',
        name: 'Minor in United States Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'urban_studies',
        name: 'Minor in Urban Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'urban_studies',
        name: 'Minor in Urban Studies',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'visual_art',
        name: 'Minor in Visual Art',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
      {
        id: 'writing_and_communication',
        name: 'Minor in Writing and Communication',
        faculty: 'Arts',
        totalCredits: 120,
        description: 'Bachelor of Arts',
        requirements: []
      },
    ]
  },
  {
    id: 'commerce-and-business-administration',
    name: 'Sauder',
    programs: [
      {
        id: 'commerce',
        name: 'Major in Commerce',
        faculty: 'UBC Sauder School of Business',
        totalCredits: 120,
        description: 'Bachelor of Commerce',
        requirements: []
      },
      {
        id: 'business_computer_science',
        name: 'Major in Business and Computer Science',
        faculty: 'UBC Sauder School of Business / Department of Computer Science',
        totalCredits: 120,
        description: 'Bachelor of Commerce',
        requirements: []
      },
    ]
  },
  {
    id: 'faculty-applied-science',
    name: 'Applied Science',
    programs: [
      {
        id: 'honours_mathematics',
        name: 'Minor in Honours Mathematics',
        faculty: 'faculty-applied-science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'arts',
        name: 'Minor in Arts',
        faculty: 'faculty-applied-science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'commerce',
        name: 'Minor in Commerce',
        faculty: 'faculty-applied-science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'entrepreneurship',
        name: 'Minor in Entrepreneurship',
        faculty: 'faculty-applied-science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
      {
        id: 'science',
        name: 'Minor in Science',
        faculty: 'faculty-applied-science',
        totalCredits: 120,
        description: 'Bachelor of Science',
        requirements: []
      },
    ]
  },
  {
    id: 'school-architecture-and-landscape-architecture',
    name: 'Architecture and Landscape Architecture',
    programs: [
      {
        id: 'honours_option',
        name: 'Honours Option',
        faculty: 'school-architecture-and-landscape-architecture',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'arts',
        name: 'Minor in Arts',
        faculty: 'school-architecture-and-landscape-architecture',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'science',
        name: 'Minor in Science',
        faculty: 'school-architecture-and-landscape-architecture',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
    ]
  },
  {
    id: 'school-of-kinesiology',
    name: 'Kinesiology',
    programs: [
      {
        id: 'arts',
        name: 'Minor in Arts',
        faculty: 'School of Kinesiology',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'commerce',
        name: 'Minor in Commerce',
        faculty: 'School of Kinesiology',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'educational_and_counselling_psychology_and_special_education',
        name: 'Minor in Educational and Counselling Psychology and Special Education',
        faculty: 'School of Kinesiology',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'nutritional_science',
        name: 'Minor in Nutritional Science',
        faculty: 'School of Kinesiology',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'science',
        name: 'Minor in Science',
        faculty: 'School of Kinesiology',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
    ]
  },
  {
    id: 'school-of-music',
    name: 'Music',
    programs: [
      {
        id: 'applied_music_technology',
        name: 'Minor in Applied Music Technology',
        faculty: 'School of Music',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'education',
        name: 'Minor in Education',
        faculty: 'School of Music',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'land_and_food_systems',
        name: 'Minor in Land and Food Systems',
        faculty: 'School of Music',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'science',
        name: 'Minor in Science',
        faculty: 'School of Music',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
    ]
  },
  {
    id: 'vancouver-school-of-economics',
    name: 'Economics',
    programs: [
      {
        id: 'honours_and_awards_at_graduation',
        name: 'Honours and Awards at Graduation',
        faculty: 'Vancouver School of Economics',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'major_or_honours_programs',
        name: 'Major or Honours Programs',
        faculty: 'Vancouver School of Economics',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'arts',
        name: 'Minor in Arts',
        faculty: 'Vancouver School of Economics',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'education',
        name: 'Minor in Education',
        faculty: 'Vancouver School of Economics',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'land_and_food_systems',
        name: 'Minor in Land and Food Systems',
        faculty: 'Vancouver School of Economics',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
      {
        id: 'science',
        name: 'Minor in Science',
        faculty: 'Vancouver School of Economics',
        totalCredits: 120,
        description: 'Bachelor',
        requirements: []
      },
    ]
  },
];

export const getFacultyById = (id: string): Faculty | undefined => {
  return faculties.find(f => f.id === id);
};

export const getProgramById = (facultyId: string, programId: string): Degree | undefined => {
  const faculty = getFacultyById(facultyId);
  return faculty?.programs.find(p => p.id === programId);
};
