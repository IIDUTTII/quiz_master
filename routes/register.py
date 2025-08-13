from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
from models.models import Users, db

registerpy = Blueprint("register", __name__)


@registerpy.route("/register", methods=["GET", "POST"])
def register_page():
    if request.method == "GET":
        if request.headers.get('Content-Type') == 'application/json':
            return jsonify({"message": "Registration endpoint ready"})
        return render_template("register.html")

    if request.headers.get('Content-Type') == 'application/json':
        data = request.get_json()
        name = data.get("name")
        username = data.get("username") 
        password = data.get("password")
        confirmPass = data.get("confirm_password")
        email = data.get("email")
    else:
        name = request.form.get("name")
        username = request.form.get("username")
        password = request.form.get("password")
        confirmPass = request.form.get("confirm_password")
        email = request.form.get("email")

    role = "user"

    if not name or name.strip() == "":
        return jsonify({"success": False, "message": "Name is required"}), 400

    if not username or username.strip() == "":
        return jsonify({"success": False, "message": "Username is required"}), 400

    if not email or email.strip() == "":
        return jsonify({"success": False, "message": "Email is required"}), 400

    if not password or password.strip() == "":
        return jsonify({"success": False, "message": "Password is required"}), 400

    if not confirmPass or confirmPass.strip() == "":
        return jsonify({"success": False, "message": "Please confirm your password"}), 400

    if len(username) < 4:
        return jsonify({"success": False, "message": "Username too short (min 4 characters)"}), 400

    if len(username) > 15:
        return jsonify({"success": False, "message": "Username too long (max 15 characters)"}), 400

    if len(password) < 8:
        return jsonify({"success": False, "message": "Password too short (min 8 characters)"}), 400

    if len(password) > 20:
        return jsonify({"success": False, "message": "Password too long (max 20 characters)"}), 400

    if password != confirmPass:
        return jsonify({"success": False, "message": "Passwords do not match"}), 400

    existingUser = Users.query.filter_by(username=username).first()
    if existingUser:
        return jsonify({"success": False, "message": "Username already exists"}), 400

    if "@" not in email or "." not in email:
        return jsonify({"success": False, "message": "Please enter a valid email"}), 400


    newUser = Users(
        name=name.strip(),
        username=username.strip(), 
        password=password,
        role=role,
        email=email.strip()
    )

    db.session.add(newUser)
    db.session.commit()

    print(f"new user registered: {username}")

    return jsonify({
        "success": True,
        "message": "User registered successfully"
    })
