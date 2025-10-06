# Future Climate Forecast Web App 
---

## Project Overview

This is a web application built with **Flask** that provides a **future climate forecast** for a specific geographical location (latitude and longitude) on a given date and time.

The forecast is generated using a simple **Linear Regression model** trained on real historical atmospheric and surface data, downloaded directly from **NASA Earthdata** servers using OPeNDAP APIs.

### Key Features
* Web interface for inputting location and date (`index.html`, `indexEn.html`).
* Data fetching from NASA Earthdata (requires `.netrc` authentication).
* Climate prediction for the year **2025**.
* Data sources include **MERRA2** and **OMI-Aura**.

### Data Trainning dates
    fechas_entrenamiento = pd.date_range(
        start=f"{año}-01-01", end=f"{año}-09-01", freq="D"
    )

### Data Sources
The project relies on data that requires authentication:
1.  **MERRA-2 (M2T1NXSLV)**: For surface variables like Temperature (T2M), Dew Point (T2MDEW), Sea Level Pressure (SLP), and Winds (U2M/V2M).
2.  **OMI-Aura (OMUVBd)**: For the UV Index (Ultraviolet Radiation).
3.  **MERRA-2 (M2T1NXADG)**: For Dust Extinction (DUEXTTFM), used as a proxy for visibility.

---

## Prerequisites

The project requires **Python 3.x** and the following libraries. It is highly recommended to use a virtual environment.

### Dependencies Installation

You can install all necessary packages using pip:

```bash
pip install flask pandas scikit-learn netCDF4 requests numpy
```
### NASA Earthdata Authentication (.netrc Setup)
The data fetching modules (data.py, datauv.py, datavis.py) attempt to authenticate using the .netrc file, as they access data from NASA's Earthdata servers (specifically URS Earthdata).

You MUST complete this step to download the historical data needed for the prediction model.

1. Get a NASA Earthdata Login Account
If you do not have one, register for a free account on the official NASA Earthdata Login portal.

2. Create the .netrc File
The .netrc file must be placed in your Home Directory and contain your NASA Earthdata Login credentials.

File Location:
```bash
Linux/macOS: ~/.netrc
```

```bash
Windows: %USERPROFILE%\_netrc (Note the leading underscore on Windows).
```
File Content:

Use a plain text editor (like VS Code, Notepad++, or nano) to create the file and add the following structure. Replace YOUR_EDL_USERNAME and YOUR_EDL_PASSWORD with your actual credentials.

```bash
machine urs.earthdata.nasa.gov
    login YOUR_EDL_USERNAME
    password YOUR_EDL_PASSWORD

machine acdisc.gesdisc.eosdis.nasa.gov
    login YOUR_EDL_USERNAME
    password YOUR_EDL_PASSWORD

machine goldsmr4.gesdisc.eosdis.nasa.gov
    login YOUR_EDL_USERNAME
    password YOUR_EDL_PASSWORD
```
#SECURITY NOTE: On Unix-like systems (Linux/macOS), it is critical to secure this file by setting restricted permissions:

```bash
chmod 600 ~/.netrc
```
Installation and Execution
Clone the Repository (or unzip the files):
```bash
# git clone <REPOSITORY_URL>
# cd <PROJECT_FOLDER>
```
Install Dependencies:
```bash
pip install flask pandas scikit-learn netCDF4 requests numpy
```
# Alternatively, use a requirements.txt file if available.

# Run the Flask Application:

```bash
python app.py
```
## Access the Application:

Open your web browser and navigate to: http://127.0.0.1:5000/

### Project Structure

* File/Folder	Description
* app.py	Main Flask application, handling routes and form submissions.
* prediccion.py	Contains the core logic: data indexing, model training (LinearRegression), and prediction.
* data.py	Module for downloading MERRA2 surface data (T2M, SLP, etc.).
* datauv.py	Module for downloading OMI-Aura UV index data.
* datavis.py	Module for downloading MERRA2 aerosol/visibility data (DUEXTTFM).
* index.html	Front-end interface in Spanish.
* indexEn.html	Front-end interface in English.
* data/	Directory that is automatically created to store the downloaded NetCDF (.nc4) data files.
