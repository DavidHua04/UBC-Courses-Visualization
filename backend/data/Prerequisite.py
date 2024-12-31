'''
Data definition of Prerequisite:
Prerequisite can show the following types of requirements and their combination:
    1. A single course requirement:
        ```
        Prerequisite(type="course", details="CPSC 221")
        ```
    2. All or one of a list of courses:
        ```
        Prerequisite(type="all_of", children=[
            Prerequisite(type="course", details="CPSC 221"),
            Prerequisite(type="course", details="CPSC 121"),
            Prerequisite(type="course", details="MATH 101"),
        ])

        Prerequisite(type="one_of", children=[
            Prerequisite(type="course", details="CPSC 221"),
            Prerequisite(type="course", details="CPSC 121"),
            Prerequisite(type="course", details="MATH 101"),
        ])
        ```

    3. Specific credit requirements:
        ```
        Prerequisite(type="credits", details={
            "min_credits": 3,
            "courses": ["COMM 291", "BIOL 300"],
            "departments": ["MATH", "STAT"],
            "level": 200,
        })
        ```
    
    4. Specific academic year standing requirements:
        ```
        Prerequisite(type="standing", details=4)
        ```
    
    5. Major Restriction:
        ```
        Prerequisite(type="major", details={
            "major": "Atmospheric Science",
            "honor": False # False means do not require honor
        })
        ```
            Any # Any means any major can choose, put this when it only need a honor major
            Science # All science major can choose
                Astronomy
                Atmospheric Science
                Biochemistry
                Biology
                Biotechnology
                Cellular, Anatomical + Physiological Sciences
                Chemistry
                Cognitive Systems: Cognition and Brain
                Cognitive Systems: Computational Intelligence + Design
                Computer Science
                Earth and Ocean Sciences
                Environmental Sciences
                Fisheries Oceanography
                Geographical Sciences
                Geology
                Geophysics
                Integrated Sciences
                Mathematics
                Mathematical Sciences
                Microbiology and Immunology
                Neuroscience
                Pharmacology
                Physics
                Statistics
                Rehabilitation Sciences
            
            Art
                Psychology
                Economics
                Sociology
                History
                Political Science
                Philosophy
                Media Studies
                Music
                Social Work
            
            Applied Science
                Civil Engineering
                Electrical Engineering
                Mechanical Engineering
                Chemical and Biological Engineering
                Nursing
                Architecture
                Applied Biology
            
            Business
                Commerce

            Education
                Educational and Counseling Psychology
                Special Education
                Kinesiology

            Forestry
                Forest Resources Management
                Wood Science
                Forest Conservation Sciences
            
            Land and Food Systems
                Food, Nutrition and Health
                Applied Biology
                Food and Resource Economics
            
            Medicine
                Medical Genetics
                Physical Therapy
                Occupational Science
                Pharmacy
            
            Pharmaceutical Sciences
                Pharmacology
                Pharmaceutical Sciences
    
    6. Course Score Requirement:
        ```
        Prerequisite(type="score", details={
            "course": "CPSC 221",
            "min_score": 65,  # Score threshold in percentage
        })
        ```
    
    7. Approval Requirement:
        ```
        Prerequisite(type="approval", details={
            "Approver":"Professor"
        })

        Prerequisite(type="approval", details={
            "Approver":"Advisor"
        })
        ```

Nested Conditions(Combinations of multiple conditions):
```
Prerequisite(type="all_of", children=[
    Prerequisite(type="course", details="FNH 250"),
    Prerequisite(type="one_of", children=[
        Prerequisite(type="course", details="BIOL 201"),
        Prerequisite(type="course", details="BIOC 202"),
    ]),
])

Prerequisite(type="one_of", children=[
    Prerequisite(type="course", details="FNH 250"),
    Prerequisite(type="one_of", children=[
        Prerequisite(type="course", details="BIOL 201"),
        Prerequisite(type="course", details="BIOC 202"),
    ]),
])

Prerequisite(type="all_of", children=[
    Prerequisite(type="score", details={"course": "CPSC 121", "min_score": 70}),
    Prerequisite(type="one_of", children=[
        Prerequisite(type="course", details="MATH 101"),
        Prerequisite(type="course", details="STAT 200"),
    ]),
])
```

'''
class Prerequisite:
    def __init__(self, type, details=None, children=None):
        """
        :param type: Type of prerequisite, e.g., "course", "all_of", "one_of", "credits", "standing", "major".
        :param details: Specific details (e.g., course code name, credit count).
        :param children: List of child Prerequisite objects for nested conditions.
        """
        self.type = type
        self.details = details
        self.children = children or []
