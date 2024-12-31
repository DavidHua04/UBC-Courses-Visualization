# Data Definition for `ubc_courses.csv`

The file contains structured information about courses offered at UBC, with each row representing a unique course. It is designed to handle advanced prerequisite and corequisite relationships using the **`Prerequisite` object structure**.

## Columns Description

| **Column Name**    | **Data Type**      | **Description**                                                                 |
|--------------------|--------------------|---------------------------------------------------------------------------------|
| `course_code`      | `string`           | Unique identifier for the course (e.g., "CPSC 210"). It includes the department and course number. |
| `course_name`      | `string`           | Full name of the course (e.g., "Software Construction").                         |
| `credits`          | `integer`          | Number of credits assigned to the course (e.g., `3`).                           |
| `description`      | `string`           | Detailed description of the course content, including objectives and topics covered. |
| `prerequisites`    | `string`           | A structured representation of prerequisites using the `Prerequisite` object. This can handle complex combinations of conditions such as specific courses, minimum credits, departmental requirements, academic standing, and nested conditions. See examples below for details. |
| `corequisites`     | `string`           | A structured representation of corequisites using the `Prerequisite` object. Similar to prerequisites, this can represent complex conditions. See examples below for details. |

### Examples of Prerequisites and Corequisites

#### Simple Course Requirement:
```plaintext
Prerequisite(type="course", details="CPSC 210")
```

#### Multiple Courses (All Required):
```plaintext
Prerequisite(type="all_of", children=[
    Prerequisite(type="course", details="CPSC 110"),
    Prerequisite(type="course", details="MATH 100")
])
```

#### Alternative Courses (One Required):
```plaintext
Prerequisite(type="one_of", children=[
    Prerequisite(type="course", details="CPSC 110"),
    Prerequisite(type="course", details="CPSC 121")
])
```

#### Credit-Based Requirement:
```plaintext
Prerequisite(type="credits", details={"min_credits": 6, "courses": [], "departments": ["MATH", "STAT"], "level": 200})
```

#### Academic Standing Requirement:
```plaintext
Prerequisite(type="standing", details="third_year_or_above")
```

#### Program/Major Requirement:
```plaintext
Prerequisite(type="major", details={
    "major": "Atmospheric Science",
    "honor": False # False means do not require honor
})
```

major choice:             
- Any # Any means any major can choose, put this when it only need a honor major
- Astronomy
- Atmospheric Science
- Biochemistry
- Biology
- Biotechnology
- Cellular, Anatomical + Physiological Sciences
- Chemistry
- Cognitive Systems: Cognition and Brain
- Cognitive Systems: Computational Intelligence + Design
- Computer Science
- Earth and Ocean Sciences
- Environmental Sciences
- Fisheries Oceanography
- Geographical Sciences
- Geology
- Geophysics
- Integrated Sciences
- Mathematics
- Mathematical Sciences
- Microbiology and Immunology
- Neuroscience
- Pharmacology
- Physics
- Physics
- Statistics

#### Course Score Requirement:
```
Prerequisite(type="score", details={
    "course": "CPSC 221",
    "min_score": 65,  # Score threshold in percentage
})
```
    
#### Approval Requirement:
```
Prerequisite(type="approval", details={
    "Approver":"Professor"
})

Prerequisite(type="approval", details={
    "Approver":"Advisor"
})
```

#### Nested Conditions:
```plaintext
Prerequisite(type="all_of", children=[
    Prerequisite(type="course", details="CPSC 210"),
    Prerequisite(type="one_of", children=[
        Prerequisite(type="course", details="MATH 101"),
        Prerequisite(type="course", details="STAT 200")
    ])
])
```

