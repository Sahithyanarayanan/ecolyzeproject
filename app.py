from flask import Flask, render_template, request, redirect, session, jsonify
from flask_sqlalchemy import SQLAlchemy
# import joblib
import os
from trimer_utils import read_fna, calculate_trimer_frequencies
from datetime import datetime, timezone
from collections import defaultdict
from itertools import product
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
import numpy as np
import pandas as pd


# ================= FLASK APP =================
app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = "super_fixed_secret_key_123"

# ================= DATABASE =================
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///e_coli.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# ================= MODELS =================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(100))


class Prediction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)
    gene_name = db.Column(db.String(100))
    file_name = db.Column(db.String(100))
    result = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

# ================= ML =================
# ================= ML (NEW LOGIC) =================

bases = ['A', 'C', 'G', 'T']
codons = [''.join(p) for p in product(bases, repeat=3)]

df = pd.read_excel("labeled_dataset_folder.xlsx")

# Remove non-numeric columns (like Folder)
df_features = df.select_dtypes(include=[np.number])

X = df_features.drop(columns=["Label"])
y = df_features["Label"]

feature_columns = X.columns

scale_pos_weight = (y == 0).sum() / (y == 1).sum()

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)

model = XGBClassifier(
    n_estimators=400,
    max_depth=7,
    learning_rate=0.05,
    subsample=0.9,
    colsample_bytree=0.9,
    scale_pos_weight=scale_pos_weight,
    random_state=42
)

model.fit(X_train, y_train)

print("✅ AI Model Ready")

# ================= UPLOAD =================
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
def read_fna_file(filepath):
    sequence = ""
    with open(filepath, "r") as file:
        for line in file:
            if not line.startswith(">"):
                sequence += line.strip().upper()
    return sequence


def extract_features(sequence):
    counts = dict.fromkeys(codons, 0)

    for i in range(0, len(sequence) - 2, 3):
        codon = sequence[i:i+3]
        if codon in counts:
            counts[codon] += 1

    df_feat = pd.DataFrame([counts])

    # Normalize safely
    row_sum = df_feat.sum(axis=1)
    df_feat = df_feat.div(row_sum.replace(0, 1), axis=0)

    # GC content
    gc_cols = [c for c in df_feat.columns if "G" in c or "C" in c]
    df_feat["GC_content"] = df_feat[gc_cols].sum(axis=1)

    # Match training columns
    df_feat = df_feat.reindex(columns=feature_columns, fill_value=0)

    return df_feat

# ================= COMMON FUNCTION =================
def generate_chart_data(predictions):
    daily_counts = defaultdict(int)
    weekly_counts = defaultdict(int)

    for p in predictions:
        if p.created_at:
            day = p.created_at.strftime('%Y-%m-%d')
            daily_counts[day] += 1

            year, week, _ = p.created_at.isocalendar()
            week_key = f"{year}-W{week}"
            weekly_counts[week_key] += 1

    return {
        "daily": dict(sorted(daily_counts.items())),
        "weekly": dict(sorted(weekly_counts.items()))
    }

# ================= ROUTES =================

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/faq")
def faq():
    return render_template("faq.html")
# ================= UPLOAD PAGE =================
# @app.route("/upload")
# def upload():
#     if 'user_id' not in session:
#         return redirect('/login')

#     user = User.query.get(session['user_id'])

#     # get result from session (for fallback)
#     result = session.pop('result', None)
#     label = session.pop('label', None)
#     toast = session.pop('toast', None)

#     return render_template(
#         "upload.html",
#         user=user,
#         result=result,
#         label=label,
#         toast=toast,
#         chart_data={}  # safe default
#     )
@app.route("/upload")
def upload():
    if 'user_id' not in session:
        return redirect('/login')

    user = User.query.get(session['user_id'])

    # 🔥 ADD THIS (for cards)
    predictions = Prediction.query.filter_by(user_id=session['user_id']) \
                              .order_by(Prediction.id.desc()) \
                              .all()

    # existing session logic (UNCHANGED)
    result = session.pop('result', None)
    label = session.pop('label', None)
    toast = session.pop('toast', None)

    return render_template(
        "upload.html",
        user=user,
        predictions=predictions,   # 🔥 NEW (for cards)
        result=result,
        label=label,
        toast=toast,
        chart_data={}  # safe default
    )

# ================= TABLE PAGE =================
# @app.route("/mytable")
# def mytable():
#     if 'user_id' not in session:
#         return redirect('/login')

#     user = User.query.get(session['user_id'])
#     predictions = Prediction.query.filter_by(user_id=user.id).all()

#     toast = session.pop('toast', None)

#     return render_template(
#         "mytable.html",
#         user=user,
#         predictions=predictions,
#         toast=toast
#     )
@app.route("/mytable")
def mytable():
    if 'user_id' not in session:
        return redirect('/login')

    user = User.query.get(session['user_id'])
    # predictions = Prediction.query.filter_by(user_id=session['user_id']).all()
    predictions = Prediction.query.filter_by(user_id=session['user_id']) \
                              .order_by(Prediction.id.desc()) \
                              .all()

    # ================= CARD DATA =================
    disease_count = sum(1 for p in predictions if "Disease" in p.result)
    normal_count = sum(1 for p in predictions if "Normal" in p.result)

    last_upload = None
    if predictions:
        last_upload = max(
            (p.created_at for p in predictions if p.created_at),
            default=None
        )

    # ================= TREND DATA (FOR CHART) =================
    from collections import defaultdict

    trend_data = defaultdict(int)

    for p in predictions:
        if p.created_at:
            day = p.created_at.strftime('%Y-%m-%d')
            trend_data[day] += 1

    trend_data = dict(sorted(trend_data.items()))

    # ================= TOAST =================
    toast = session.pop('toast', None)

    return render_template(
        "mytable.html",
        user=user,
        predictions=predictions,
        toast=toast,

        # 🔥 NEW DATA FOR CARDS
        disease_count=disease_count,
        normal_count=normal_count,
        last_upload=last_upload,

        # 🔥 FOR CHART
        trend_data=trend_data
    )


# ================= ANALYTICS PAGE =================
# @app.route("/analytics")
# def analytics():
#     if 'user_id' not in session:
#         return redirect('/login')

#     user = User.query.get(session['user_id'])
#     predictions = Prediction.query.filter_by(user_id=user.id).all()

#     chart_data = generate_chart_data(predictions)

#     return render_template(
#         "analytics.html",
#         user=user,
#         chart_data=chart_data
#     )
@app.route("/analytics")
def analytics():
    if 'user_id' not in session:
        return redirect('/login')

    user = User.query.get(session['user_id'])
    predictions = Prediction.query.filter_by(user_id=session['user_id']) \
                              .order_by(Prediction.id.desc()) \
                              .all()

    # ================= CHART DATA =================
    chart_data = generate_chart_data(predictions)

    # ================= EXTRA CARD DATA =================
    from collections import defaultdict

    trend_data = defaultdict(int)

    for p in predictions:
        if p.created_at:
            day = p.created_at.strftime('%Y-%m-%d')
            trend_data[day] += 1

    # MOST ACTIVE DAY
    most_active_day = None
    if trend_data:
        most_active_day_str = max(trend_data, key=trend_data.get)
        from datetime import datetime
        most_active_day = datetime.strptime(most_active_day_str, '%Y-%m-%d')

    # RECENT UPLOAD
    last_upload = None
    if predictions:
        last_upload = max(
            (p.created_at for p in predictions if p.created_at),
            default=None
        )

    # DISEASE COUNT
    disease_count = sum(1 for p in predictions if "Disease" in p.result)

    # AVG PER DAY
    total_days = len(trend_data)
    avg_per_day = len(predictions) / total_days if total_days else 0

    return render_template(
        "analytics.html",
        user=user,
        chart_data=chart_data,

        # 🔥 NEW VARIABLES FOR CARDS
        predictions=predictions,
        most_active_day=most_active_day,
        last_upload=last_upload,
        disease_count=disease_count,
        avg_per_day=avg_per_day
    )

@app.route("/dataset")
def dataset():
    return render_template("departments.html")


@app.route("/analysis")
def analysis():
    return render_template("contact.html")


@app.route("/model")
def model_details():
    return render_template("doctors.html")


# ================= AUTH =================
@app.route("/login", methods=["POST"])
def login():
    email = request.form['email']
    password = request.form['password']

    user = User.query.filter_by(email=email, password=password).first()

    if not user:
        return render_template("contact.html", message="User not found!", type="error")

    session['user_id'] = user.id
    return redirect('/upload')   # ✅ changed


@app.route("/register", methods=["POST"])
def register():
    name = request.form['name']
    email = request.form['email']
    password = request.form['password']

    existing = User.query.filter_by(email=email).first()
    if existing:
        return render_template("contact.html", message="User already exists!", type="error")

    new_user = User(name=name, email=email, password=password)
    db.session.add(new_user)
    db.session.commit()

    return render_template("contact.html", message="Registered successfully!", type="success")


@app.route("/logout")
def logout():
    session.pop('user_id', None)
    return redirect('/')


# ================= PREDICTION =================
# @app.route("/predict", methods=["POST"])
# def predict():
#     if 'user_id' not in session:
#         return jsonify({"error": "Unauthorized"}), 401

#     user = User.query.get(session['user_id'])

#     try:
#         gene_name = request.form.get("gene")

#         if "dna_file" not in request.files:
#             raise Exception("No file uploaded")

#         file = request.files["dna_file"]

#         if file.filename == "":
#             raise Exception("No file selected")

#         if not file.filename.lower().endswith(".fna"):
#             raise Exception("Only .fna files allowed")

#         filepath = os.path.join(UPLOAD_FOLDER, file.filename)
#         file.save(filepath)

#         sequence = read_fna_file(filepath)
#         df_test = extract_features(sequence)

#         X_scaled = scaler.transform(df_test.values)
#         pred = model.predict(X_scaled)

#         X_scaled = scaler.transform(X)
#         pred = model.predict(X_scaled)

#         label = "Disease" if pred[0] == 1 else "Normal"
#         result_text = f"{gene_name} → {label}"

#         new_data = Prediction(
#             user_id=user.id,
#             gene_name=gene_name,
#             file_name=file.filename,
#             result=result_text,
#             created_at=datetime.now(timezone.utc)
#         )
#         db.session.add(new_data)
#         db.session.commit()

#     except Exception as e:
#         return jsonify({
#             "label": "Error",
#             "result": str(e)
#         })

#     if request.headers.get("X-Requested-With") == "XMLHttpRequest":
#         return jsonify({
#             "label": label,
#             "result": result_text
#         })
#     else:
#         session['result'] = result_text
#         session['label'] = label
#         return redirect('/upload')   # ✅ changed

@app.route("/predict", methods=["POST"])
def predict():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user = User.query.get(session['user_id'])

    try:
        gene_name = request.form.get("gene")

        if "dna_file" not in request.files:
            raise Exception("No file uploaded")

        file = request.files["dna_file"]

        if file.filename == "":
            raise Exception("No file selected")

        if not file.filename.lower().endswith(".fna"):
            raise Exception("Only .fna files allowed")

        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)

        # ✅ Read sequence
        sequence = read_fna_file(filepath)

        # ✅ Validate sequence
        if not sequence or len(sequence) < 3:
            raise Exception("Invalid DNA sequence")

        # ✅ Extract features
        df_test = extract_features(sequence)

        # ✅ Scale properly
        X_scaled = scaler.transform(df_test.values)

        # ✅ Predict
        pred = model.predict(X_scaled)

        label = "Disease" if pred[0] == 1 else "Normal"
        result_text = f"{gene_name} → {label}"

        # Save to DB
        new_data = Prediction(
            user_id=user.id,
            gene_name=gene_name,
            file_name=file.filename,
            result=result_text,
            created_at=datetime.now(timezone.utc)
        )
        db.session.add(new_data)
        db.session.commit()

    except Exception as e:
        print("ERROR:", str(e))  # 👈 very important for debugging
        return jsonify({
            "label": "Error",
            "result": str(e)
        })

    return jsonify({
        "label": label,
        "result": result_text
    })
# ================= DELETE =================
@app.route("/delete/<int:id>", methods=["POST"])
def delete_prediction(id):
    if 'user_id' not in session:
        return redirect('/')

    prediction = Prediction.query.get(id)

    if prediction and prediction.user_id == session['user_id']:
        db.session.delete(prediction)
        db.session.commit()

    session['toast'] = 'deleted'
    return redirect('/mytable')   # ✅ changed


# ================= EDIT =================
@app.route("/edit_prediction/<int:id>", methods=["POST"])
def edit_prediction(id):
    if 'user_id' not in session:
        return redirect('/')

    data = Prediction.query.get(id)

    if data and data.user_id == session['user_id']:
        data.gene_name = request.form.get("gene")
        db.session.commit()

    session['toast'] = 'saved'
    return redirect('/mytable')   # ✅ changed


@app.route("/delete_user/<int:id>", methods=["POST"])
def delete_user(id):
    if 'user_id' not in session:
        return redirect('/upload')

    user = User.query.get(id)

    if user and user.id == session['user_id']:
        db.session.delete(user)
        db.session.commit()
        session.clear()
        return redirect('/')

    session['toast'] = 'deleted'
    return redirect('/upload')


@app.route("/edit_user/<int:id>", methods=["POST"])
def edit_user(id):
    if 'user_id' not in session:
        return redirect('/upload')

    user = User.query.get(id)

    if user and user.id == session['user_id']:
        user.name = request.form.get("name")
        user.email = request.form.get("email")
        db.session.commit()

    session['toast'] = 'saved'
    return redirect('/upload')


# ================= API =================
@app.route("/api/predictions")
def api_predictions():
    data = Prediction.query.all()
    return jsonify([
        {
            "id": d.id,
            "user_id": d.user_id,
            "gene": d.gene_name,
            "file": d.file_name,
            "result": d.result
        } for d in data
    ])


@app.route("/api/users")
def api_users():
    users = User.query.all()
    return jsonify([
        {"id": u.id, "name": u.name, "email": u.email}
        for u in users
    ])
@app.route("/dashboard")
def dashboard():
    if 'user_id' not in session:
        return "Unauthorized", 401

    # load default section (upload)
    return render_template("upload.html")


# ================= DYNAMIC SECTION ROUTES =================
@app.route("/load/<section>")
def load_section(section):

    if section == "upload":
        return render_template("pages/upload.html")

    elif section == "mytable":
        return render_template("pages/mytable.html")

    elif section == "analytics":
        return render_template("pages/analytics.html")

    return "Page not found", 404


# ================= DB =================
with app.app_context():
    db.create_all()

# ================= RUN =================
if __name__ == "__main__":
    app.run(debug=True, port=8081)