import requests
import pandas as pd
import json

def fetch_department_list():
    # Fetch all course data
    response = requests.get("https://ubcexplorer.io/getAllCourses")
    all_courses = response.json()

    df_courses = pd.DataFrame(all_courses)

    return df_courses[["dept","cred"]].groupby("dept").mean().reset_index()["dept"].tolist()

department_list = fetch_department_list()

# Write list to a JSON file
with open('backend/data/department_list.json', 'w') as file:
    json.dump(department_list, file)

if __name__ == '__main__':
    print(department_list)