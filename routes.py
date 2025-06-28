import requests
import json
import logging
from flask import render_template, request, redirect, url_for, flash, session, jsonify
from app import app, db
from models import User, Message

@app.route('/')
def index():
    """Home page - redirect to chat if logged in, otherwise show landing page"""
    if 'user_id' in session:
        return redirect(url_for('chat'))
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration"""
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validation
        if not username or not email or not password:
            flash('All fields are required.', 'error')
            return render_template('register.html')
        
        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return render_template('register.html')
        
        if len(password) < 6:
            flash('Password must be at least 6 characters long.', 'error')
            return render_template('register.html')
        
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            flash('Username already exists.', 'error')
            return render_template('register.html')
        
        if User.query.filter_by(email=email).first():
            flash('Email already registered.', 'error')
            return render_template('register.html')
        
        # Create new user
        try:
            user = User()
            user.username = username
            user.email = email
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            logging.error(f"Registration error: {e}")
            flash('Registration failed. Please try again.', 'error')
            return render_template('register.html')
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login"""
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        if not username or not password:
            flash('Username and password are required.', 'error')
            return render_template('login.html')
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            flash(f'Welcome back, {user.username}!', 'success')
            return redirect(url_for('chat'))
        else:
            flash('Invalid username or password.', 'error')
            return render_template('login.html')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    """User logout"""
    session.clear()
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('index'))

@app.route('/chat')
def chat():
    """Chat interface - requires login"""
    if 'user_id' not in session:
        flash('Please log in to access the chat.', 'warning')
        return redirect(url_for('login'))
    
    # Get user's message history
    user_id = session['user_id']
    messages = Message.query.filter_by(user_id=user_id).order_by(Message.timestamp.asc()).all()
    
    return render_template('chat.html', messages=messages, username=session['username'])

@app.route('/send_message', methods=['POST'])
def send_message():
    """Send message to emotion detection webhook and save response"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        user_id = session['user_id']
        
        # Send message to webhook
        webhook_url = "https://sumit00777.app.n8n.cloud/webhook/emotiondetectionapp"
        webhook_payload = {
            "message": user_message,
            "user_id": user_id,
            "username": session['username']
        }
        
        try:
            # Send POST request to webhook
            response = requests.post(
                webhook_url, 
                json=webhook_payload, 
                timeout=30,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                try:
                    # Log the full response for debugging
                    logging.info(f"Webhook response: {response.text}")
                    
                    # Try to parse JSON response
                    response_data = response.json()
                    logging.info(f"Parsed JSON: {response_data}")
                    
                    # Check multiple possible response fields
                    ai_response = (
                        response_data.get('response') or 
                        response_data.get('message') or 
                        response_data.get('text') or 
                        response_data.get('output') or
                        response_data.get('result') or
                        str(response_data) if response_data else
                        'I received your message but couldn\'t generate a response.'
                    )
                except Exception as e:
                    logging.error(f"Failed to parse JSON response: {e}")
                    # Improved fallback for empty or invalid response
                    if not response.text or response.text.strip() == "":
                        ai_response = "Sorry, the AI service did not return any response. Please try again later or contact support if this keeps happening."
                    else:
                        ai_response = response.text
            else:
                logging.error(f"Webhook returned status {response.status_code}: {response.text}")
                if response.status_code == 404:
                    try:
                        error_data = response.json()
                        if "test mode" in error_data.get('hint', '').lower():
                            ai_response = "The AI service is in test mode and needs to be activated. Please activate the workflow in your n8n dashboard by clicking 'Execute workflow', then try sending your message again."
                        else:
                            ai_response = "The AI service endpoint is not available. Please check your n8n workflow configuration."
                    except:
                        ai_response = "The AI service is currently unavailable. Please try again later."
                else:
                    ai_response = "I'm currently having trouble processing your message. Please try again later."
                
        except requests.exceptions.Timeout:
            logging.error("Webhook request timed out")
            ai_response = "I'm taking longer than usual to respond. Please try again."
        except requests.exceptions.ConnectionError:
            logging.error("Failed to connect to webhook")
            ai_response = "I'm currently unavailable. Please try again later."
        except Exception as e:
            logging.error(f"Webhook request failed: {e}")
            ai_response = "I encountered an error processing your message. Please try again."
        
        # Save message to database
        message = Message()
        message.user_id = user_id
        message.user_message = user_message
        message.ai_response = ai_response
        db.session.add(message)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'ai_response': ai_response,
            'timestamp': message.timestamp.strftime('%H:%M')
        })
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error in send_message: {e}")
        return jsonify({'error': 'Failed to process message'}), 500

@app.route('/clear_history', methods=['POST'])
def clear_history():
    """Clear user's message history"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        user_id = session['user_id']
        Message.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error clearing history: {e}")
        return jsonify({'error': 'Failed to clear history'}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('base.html', error_message="Page not found"), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('base.html', error_message="Internal server error"), 500