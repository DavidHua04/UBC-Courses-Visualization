# UBC-Courses-Visualization

This repository provides a comprehensive visualization of all required **Computer Science (CS)**, **Statistics (STAT)**, and **Mathematics (MATH)** courses at the University of British Columbia (UBC). The visualization is created using Markdown with Mermaid diagrams in a Jupyter Notebook (`.ipynb` file), offering an easy-to-follow overview of course structures, prerequisites, and relationships.

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
