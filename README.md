# UBC-Courses-Visualization

This repository provides a comprehensive visualization of all required **Computer Science (CS)**, **Statistics (STAT)**, and **Mathematics (MATH)** courses at the University of British Columbia (UBC). The visualization is created using Markdown with Mermaid diagrams in a Jupyter Notebook (`.ipynb` file), offering an easy-to-follow overview of course structures, prerequisites, and relationships.

Additionally, the repository features a small user interface that allows you to input a course code and view a visualization of its prerequisites. For example, by entering **CPSC 410**, users can see the full list of prerequisites.

### Example User Interface:

**Input Course Code (e.g., CPSC 410):**
![Input CPSC 410](https://github.com/user-attachments/assets/caf8c6db-cbbf-4cd2-936e-f7320cf8876d)

**Prerequisite Visualization in Browser:**
![Prerequisite Visualization](https://github.com/user-attachments/assets/e6f2b357-c40e-4223-bec4-2ef5d75ee984)

### Limitations and User Contribution

Currently, all course objects in this repository have been extracted using GPT, focusing on **Computer Science (CS)**, **Statistics (STAT)**, and **Mathematics (MATH)** courses. However, there are a few important points to consider:

1. **Limited Scope:** Only CS, STAT, and MATH courses in UBC are included in the visualization. Alternative courses that could be prerequisites for these courses may not be shown. User can add the course subject they want at `Course List` part to enable this project to work for not-included courses.
2. **Potential Hallucinations:** Since the course data has been generated using GPT, there may be occasional errors or hallucinated information in the course details. This could lead to minor inaccuracies in prerequisites or course descriptions.
   
To improve the accuracy and breadth of the course data, **users are encouraged to review the existing course information** for any potential errors and **add more courses** or **suggest corrections**. Your contributions will help make the visualization more accurate and comprehensive.

## Future Plans

I will be adding another Jupyter Notebook (`.ipynb` file) that will provide the following features:

1. **Web Crawler:** A code block that prompts users to input their university's course description website and extracts all the text from that page.
2. **Course Information Extraction:** A code block that utilizes a large language model's API to analyze the extracted text and organize the course information into a structured format.
3. **Course Object Creation:** A final code block that converts the organized course data into corresponding **Course** objects, which can then be imported into the current visualization system. This will allow users to generate course visualizations for universities other than UBC, based on their own course description websites.

Stay tuned for this upcoming feature to expand the course visualization beyond UBC!

## Features

- **Mermaid Markdown Diagrams**: Interactive flowcharts show the prerequisite relationships between UBC CS, STAT, and MATH courses.
- **Clear Course Structure**: Each course displays its name, credits, and dependencies in an intuitive format.
- **Jupyter Notebook**: Easily run and edit the visualization to customize it for your needs.

## Repository Structure

```
UBC-Courses-Visualization/
├── README.md         # This file
├── UBC_Courses.ipynb # Main Jupyter Notebook containing Mermaid diagrams
└── .gitignore        # Standard Git ignore file
```

## Getting Started

### Prerequisites

1. **Python**: Ensure you have Python installed (version 3.7 or higher).
2. **Jupyter Notebook**: Install Jupyter Notebook using the following command:
   ```bash
   pip install notebook
   ```
3. **Mermaid Support**: If running in JupyterLab, install Mermaid support:
   ```bash
   pip install jupyterlab-myst
   jupyter labextension install @jupyterlab/markdown-it-mermaid
   ```

### Cloning the Repository

```bash
git clone https://github.com/DavidHua04/UBC-Courses-Visualization.git
cd UBC-Courses-Visualization
```

### Running the Notebook

1. Open the Jupyter Notebook:
   ```bash
   jupyter notebook UBC_Courses.ipynb
   ```
2. Navigate to the `UBC_Courses.ipynb` file and explore the visualized course structure.

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add your message here"
   ```
4. Push the branch:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **University of British Columbia**: Course information used for visualization.
- **Mermaid.js**: For providing an intuitive way to create flowcharts in Markdown.
- **Jupyter Notebook**: For enabling interactive and reproducible workflows.

---

Feel free to explore, customize, and expand this project to suit your academic planning needs!
