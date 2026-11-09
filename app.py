from flask import Flask, render_template, jsonify
import pandas as pd
import numpy as np
from datetime import datetime
import pytz
import os

app = Flask(__name__)

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'Play Store Data.csv')

def parse_size(size_str):
    if pd.isna(size_str) or str(size_str).strip() == 'Varies with device':
        return np.nan
    s = str(size_str).strip()
    if s.endswith('M'):
        try: return float(s[:-1])
        except: return np.nan
    elif s.endswith('k') or s.endswith('K'):
        try: return float(s[:-1]) / 1024.0
        except: return np.nan
    return np.nan

def parse_installs(inst_str):
    if pd.isna(inst_str):
        return np.nan
    s = str(inst_str).replace('+', '').replace(',', '').strip()
    try: return float(s)
    except: return np.nan

def load_processed_data():
    if not os.path.exists(DATA_PATH):
        return None
    
    df = pd.read_csv(DATA_PATH)
    
    # Filter 1: App names with NO numbers
    df = df[~df['App'].astype(str).str.contains(r'\d', na=False)]
    
    # Filter 2: Average rating >= 4.2
    df['Rating'] = pd.to_numeric(df['Rating'], errors='coerce')
    df = df[df['Rating'] >= 4.2]
    
    # Filter 3: Reviews > 1,000
    df['Reviews'] = pd.to_numeric(df['Reviews'], errors='coerce')
    df = df[df['Reviews'] > 1000]
    
    # Filter 4: Category starts with 'T' or 'P'
    df = df[df['Category'].astype(str).str.startswith(('T', 'P'), na=False)]
    
    # Filter 5: App sizes between 20 MB and 80 MB
    df['Size_MB'] = df['Size'].apply(parse_size)
    df = df[(df['Size_MB'] >= 20.0) & (df['Size_MB'] <= 80.0)]
    
    # Clean Installs and Last Updated
    df['Installs_clean'] = df['Installs'].apply(parse_installs)
    df['Last Updated'] = pd.to_datetime(df['Last Updated'], errors='coerce')
    df = df.dropna(subset=['Last Updated', 'Installs_clean'])
    
    df['YearMonth'] = df['Last Updated'].dt.to_period('M')
    
    # Aggregate monthly installs per category
    pivot_df = df.pivot_table(
        index='YearMonth',
        columns='Category',
        values='Installs_clean',
        aggfunc='sum',
        fill_value=0
    )
    
    # Complete monthly range from min date to max date
    all_months = pd.period_range(start=pivot_df.index.min(), end=pivot_df.index.max(), freq='M')
    pivot_df = pivot_df.reindex(all_months, fill_value=0)
    
    # Compute CUMULATIVE installs over time
    cum_df = pivot_df.cumsum()
    
    # Category translation mapping
    translation_map = {
        'TRAVEL_AND_LOCAL': 'Voyage et local',   # French
        'PRODUCTIVITY': 'Productividad',         # Spanish
        'PHOTOGRAPHY': '写真',                   # Japanese
        'TOOLS': 'Tools',                        # English / Default
        'PERSONALIZATION': 'Personalization',    # English / Default
        'PARENTING': 'Parenting'                 # English / Default
    }
    
    categories = list(cum_df.columns)
    months = [str(m) for m in cum_df.index]
    
    # Identify MoM increase > 25% on monthly non-cumulative or cumulative series
    # Let's compute MoM percentage increase on monthly new installs & cumulative installs
    highlight_matrix = {}
    for cat in categories:
        monthly_installs = pivot_df[cat].values
        highlights = []
        for i in range(len(monthly_installs)):
            if i == 0:
                highlights.append(False)
            else:
                prev = monthly_installs[i-1]
                curr = monthly_installs[i]
                if prev > 0 and ((curr - prev) / prev > 0.25):
                    highlights.append(True)
                elif prev == 0 and curr > 0:
                    highlights.append(True)
                else:
                    highlights.append(False)
        highlight_matrix[cat] = highlights
        
    series_data = []
    for cat in categories:
        translated_name = translation_map.get(cat, cat)
        series_data.append({
            'original_category': cat,
            'translated_category': translated_name,
            'cumulative_installs': cum_df[cat].tolist(),
            'monthly_installs': pivot_df[cat].tolist(),
            'highlights': highlight_matrix[cat]
        })
        
    return {
        'months': months,
        'series': series_data
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/time-check')
def time_check():
    tz = pytz.timezone('Asia/Kolkata')
    now = datetime.now(tz)
    is_active = (16 <= now.hour < 18)
    return jsonify({
        'is_active': is_active,
        'current_time_ist': now.strftime('%Y-%m-%d %H:%M:%S IST'),
        'hour': now.hour,
        'minute': now.minute
    })

@app.route('/api/chart-data')
def chart_data():
    tz = pytz.timezone('Asia/Kolkata')
    now = datetime.now(tz)
    is_active = (16 <= now.hour < 18)
    
    # For visualization/testing API response includes data, but client enforces exact IST gate.
    data = load_processed_data()
    return jsonify({
        'is_active': is_active,
        'data': data
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
