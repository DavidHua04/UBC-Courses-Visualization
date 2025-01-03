# UBC-Courses-Visualization

This repository provides the following functions:
## 1. Course Searching

Search for all courses that contain specific string in the name of the courses

## 2. Course Planning

Given the course list that you need to take(Major Courses + Other courses you want), the course list of courses you have already taken and the maximum of credit you want to take per term, produce a reasonable course arrangement.

## 3. Course Prerequisites Visualization

Feature a small user interface that allows you to input a course code and view a visualization of its prerequisites. For example, by entering **CPSC 410**, users can see the full list of prerequisites.

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

Turn this tool into website.

Stay tuned for this upcoming feature to expand the course visualization beyond UBC!

## Features

- **Mermaid Markdown Diagrams**: Interactive flowcharts show the prerequisite relationships between UBC CS, STAT, and MATH courses.
- **Clear Course Structure**: Each course displays its name, credits, and dependencies in an intuitive format.
- **Jupyter Notebook**: Easily run and edit the visualization to customize it for your needs.

## Repository Structure

```
UBC-Courses-Visualization/
├── backend/                    # Backend service (Flask)
│   ├── app.py                  # Main Flask application
│   ├── requirements.txt        # Backend dependencies
│   └── config.py               # Configuration settings (optional)
├── frontend/                   # Frontend application (React)
│   ├── public/
│   │   └── index.html          # Main HTML file
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   │   ├── CourseSearch.js # Component for course search
│   │   │   ├── Planner.js      # Component for course planning
│   │   │   └── Visualizer.js   # Component for prerequisite visualization
│   │   ├── App.js              # Main React app
│   │   ├── index.js            # Entry point for React
│   │   └── App.css             # Global styles
│   ├── package.json            # Frontend dependencies
├── README.md                   # Documentation for the project
├── LICENSE                     # Standard MIT LICENSE
└── .gitignore                  # Files to ignore in Git
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
