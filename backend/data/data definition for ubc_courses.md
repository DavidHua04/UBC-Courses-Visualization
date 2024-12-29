# Data Definition for `ubc_courses.csv`

The file contains structured information about courses offered at UBC, with each row representing a unique course. It is designed to handle advanced prerequisite and corequisite relationships using **nested lists**.

## Columns Description

| **Column Name**    | **Data Type**      | **Description**                                                                 |
|--------------------|--------------------|---------------------------------------------------------------------------------|
| `course_code`      | `string`           | Unique identifier for the course (e.g., "CPSC 210"). It includes the department and course number. |
| `course_name`      | `string`           | Full name of the course (e.g., "Software Construction").                         |
| `credits`          | `integer`          | Number of credits assigned to the course (e.g., `3`).                           |
| `description`      | `string`           | Detailed description of the course content, including objectives and topics covered. |
| `prerequisites`    | `list[list[str]]`  | Nested list representing prerequisite courses. Each inner list contains course codes, with alternatives grouped together. See **Prerequisite Examples** for details. |
| `corequisites`     | `list[list[str]]`  | Nested list representing corequisite courses. Each inner list contains course codes, with alternatives grouped together. See **Corequisite Examples** for details. |

## Nested List Definitions

1. **Nested Lists**:
   - The outer list represents a series of requirements.
   - The inner list contains alternatives, where completing at least one course from the list satisfies that requirement.

2. **Examples**:
   - `[[CPSC 110], [CPSC 121, CPSC 210]]`
     - Requires **CPSC 110** AND one of **CPSC 121** or **CPSC 210**.

   - `[[STAT 200, STAT 201], [MATH 200]]`
     - Requires one of **STAT 200** or **STAT 201**, AND **MATH 200**.

---

## Usage Notes

1. **Null or Empty Values**:
   - Columns `prerequisites` and `corequisites` will contain empty lists (`[]`) if there are no prerequisites or corequisites for the course.

2. **Advanced Parsing**:
   - The nested list structure allows for easy visualization of relationships and logic-based queries, such as:
     - **Check if a course satisfies prerequisites**.
     - **Generate prerequisite trees**.

---

## Example Row

| **course_code** | **course_name**        | **credits** | **description**                                       | **prerequisites**                  | **corequisites**         |
|-----------------|------------------------|-------------|-------------------------------------------------------|------------------------------------|--------------------------|
| `CPSC 210`      | `Software Construction`| 4           | `Introduction to software development, design, and testing.` | `[[CPSC 110], [CPSC 121, CPSC 210]]` | `[]`                     |
| `STAT 300`      | `Intermediate Statistics`| 3         | `Statistical methods for applied sciences.`           | `[[STAT 200, STAT 201]]`           | `[[MATH 200]]`           |