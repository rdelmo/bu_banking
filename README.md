# Dummy Banking Application Project

## Instructions 
### Week 1 - Agile
### Week2 - Running the project

Clone the project with git
Fork the repo in github first to your account .
After forking clone your repo to which you will have push rights.

`git clone https://github.com/ [your_gh_account_here] /bu_banking.git`

Change directory to application

`cd bu_banking`

Activate python virtual environment to keep your environment clean - we will install all python dependencies inside python venv

`python3 -m venv venv`


Activate virtual env (you will have to do it each time if you wont automate)
**Linux:**

`source venv/bin/activate`

**Windows:**
cmd.exe |  <C:\> <venv>\Scripts\activate.bat
PowerShell |  C:\> <venv>\Scripts\Activate.ps1

Install python packages within this virtualenvironment

`pip3 install -r requirements.txt`

Run the application

`python3 manage.py runserver 0.0.0.0:8000`

Access website on your localhost http://127.0.0.1:8000/api/

Endpoints

Django rest default page: http://127.0.0.1:8001/api/
Redoc : http://127.0.0.1:8001/api/redoc/
Swagger : http://127.0.0.1:8001/api/swagger/

Explore!!

To create superuser stop running server and run (within venv)

`python3 manage.py createsuperuser`

### Week3 - Containerization

Make sure you have docker installed. (docker-desktop/wsl on windows)

* withing your project directory create Dockerfile with content
`FROM python:3.12

WORKDIR /app

COPY . /app

RUN ["pip3","install","-r","requirements.txt"]

CMD ["python3","manage.py","runserver","0.0.0.0:8000"]`

Build image out of above Dockerfile

`docker build -t banking .`

Check your images

`docker image ls`

After succesfull build run the container from image you have build 

`sudo docker run -p 8001:8000 banking`

Access website on your localhost http://127.0.0.1:8000/api/

now kill the server Ctrl+C

and run docker compose which will share local drive to the container - this way you will be able to edit files and see changes in container.
Make sure you have docker-compose installed try with running 

`docker-compose` or `docker compose`

Create docker-compose.yml within project directory

```
version: '3.8'

services:
  agent-zero-run:
    image: banking
    build: . #this will build from current dir if banking image is not on your system
    ports:
      - "8000:8000"
    env_file:
      - ./.env #env vars if you need them in app container
    volumes:
      - ./:/app    
    restart: "no"

```

Run 
`docker-compose up` or `docker compose up`
 you should see similar:

```
 sudo docker compose up
[+] Running 2/2
 ✔ Network bu_banking_default             Created                                                                  0.2s
 ✔ Container bu_banking-agent-zero-run-1  Created                                                                  0.0s
Attaching to bu_banking-agent-zero-run-1
bu_banking-agent-zero-run-1  | Watching for file changes with StatReloader
```
access page on http://127.0.0.1:8000/api/


### Week4 - SDLC CICD

Enter project directory and then cicd dir

`cd cicd`

run cicd stack with 

`docker-compose up`

That will take a while as will need to pull 8 different images 

After it's run access Jenkins on 8080




Create ssh key pair with 

`ssh-keygen -t ed25519 -C "your_email@example.com"`

You will have public and private keys in your home directory

ls /home/greg/.ssh/
id_ed25519  id_ed25519.pub 

Private key is without any extension this goes to Jenkins

### Week5 - Automation Testing 

## OPENPROJECT:

https://twopointzero.me/

**Epics** are tied to each week’s overall theme (e.g., “Introduction to Containers” or “SDLC”).

**User Stories** capture what each group (Leadership or Engineering) needs in order to fulfill that theme.

**Tasks** are concrete actions or deliverables needed to complete the User Stories.

Engineering:
Feel free to assign yourselk to the tasks and resolve them.
Leadership: 
Collaborate with engineering - comment on tasks/epics/user stories to validate if the user stories were delivered.

---

## How to Run the App — Complete Beginner Guide

This guide assumes you have never written code before. Follow every step in order.

The app has two parts that must run at the same time:
- **Backend** (Django) — the server that handles data, runs on port 8000
- **Frontend** (React) — the visual interface you see in the browser, runs on port 3000

---

### Step 1 — Install the required software

You only need to do this once.

1. **Install Git** — download from https://git-scm.com/downloads and run the installer. Leave all options as default.
2. **Install Python** — download from https://www.python.org/downloads and run the installer.
   - On Windows: tick **"Add Python to PATH"** before clicking Install.
3. **Install Node.js** — download the **LTS** version from https://nodejs.org and run the installer. Leave all options as default.
   - Node.js includes `npm`, which is used to install the frontend dependencies.
4. **Install Visual Studio Code (VS Code)** — download from https://code.visualstudio.com and run the installer.

---

### Step 2 — Create a GitHub account (if you don't have one)

1. Go to https://github.com
2. Click **Sign up** and follow the steps to create a free account.

---

### Step 3 — Fork the project repository

Forking creates your own personal copy of the project on GitHub.

1. Go to the project repository page on GitHub (your instructor will share the link).
2. Click the **Fork** button in the top-right corner of the page.
3. Click **Create fork**. You now have your own copy.

---

### Step 4 — Copy (clone) the project to your computer

1. On your forked repository page, click the green **Code** button.
2. Make sure **HTTPS** is selected, then click the **copy icon** to copy the URL shown.
3. Open **Git Bash** (Windows) or **Terminal** (Mac/Linux).
4. Type the following command, replacing the URL with the one you just copied:

```
git clone https://github.com/YOUR_USERNAME/bu_banking.git
```

5. Press **Enter**. A new folder called `bu_banking` will appear on your computer.

---

### Step 5 — Open the project in VS Code

1. Open **VS Code**.
2. Click **File** → **Open Folder**.
3. Find and select the `bu_banking` folder you just cloned, then click **Open**.

---

### Step 6 — Open the built-in Terminal in VS Code

1. In VS Code, click **Terminal** in the top menu bar.
2. Click **New Terminal**.
3. A panel will open at the bottom of the screen.

You will need **two terminals open at the same time** — one for the backend and one for the frontend. To open a second terminal, click the **+** icon in the top-right corner of the terminal panel.

---

## Terminal 1 — Run the Backend (Django)

Do all of the following steps in your **first terminal**.

---

### Step 7 — Create a Python virtual environment

Type this command and press **Enter**:

```
python3 -m venv venv
```

> **Windows users:** use `python` instead of `python3`

---

### Step 8 — Activate the virtual environment

You need to do this **every time** you open a new terminal.

**Mac / Linux:**
```
source venv/bin/activate
```

**Windows (Command Prompt):**
```
venv\Scripts\activate.bat
```

**Windows (PowerShell):**
```
venv\Scripts\Activate.ps1
```

You will see `(venv)` appear at the start of the terminal line — this means it worked.

---

### Step 9 — Install the Python dependencies

```
pip3 install -r requirements.txt
```

> **Windows users:** use `pip` instead of `pip3`

Wait for it to finish. This downloads all the backend libraries the app needs.

---

### Step 10 — Start the backend server

```
python3 manage.py runserver
```

> **Windows users:** use `python` instead of `python3`

You should see a message like `Starting development server at http://127.0.0.1:8000/`. **Leave this terminal running. Do not close it.**

---

## Terminal 2 — Run the Frontend (React UI)

Click the **+** icon in the terminal panel to open a **second terminal**. Do all of the following steps there.

---

### Step 11 — Go into the frontend folder

```
cd frontend
```

---

### Step 12 — Install the frontend dependencies

```
npm install
```

This downloads all the visual interface libraries. It may take a minute. You only need to do this once.

---

### Step 13 — Start the frontend

```
npm run dev
```

You should see a message like `Local: http://localhost:3000/`. **Leave this terminal running too.**

---

### Step 14 — Open the app in your browser

Open any web browser (Chrome, Firefox, Safari, Edge) and go to:

```
http://localhost:3000
```

You should now see the full visual interface of the app.

---

### Stopping the app

Go to each terminal and press **Ctrl + C** on your keyboard to stop it. Do this for both terminals.

---

### Common problems

| Problem | Solution |
|---|---|
| `python3: command not found` | Make sure Python is installed and added to PATH (see Step 1) |
| `pip3: command not found` | Try `pip` instead of `pip3` |
| `(venv)` not showing | Re-run the activate command from Step 8 |
| `npm: command not found` | Make sure Node.js is installed (see Step 1) |
| `npm install` errors | Delete the `frontend/node_modules` folder and run `npm install` again |
| Frontend shows blank page or errors | Make sure the backend (Terminal 1) is still running |
| Port already in use | Close any other running servers and try again |

