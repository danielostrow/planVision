#####################################################
#         _          __     ___     _               #
#   _ __ | | __ _ _ _\ \   / (_)___(_) ___  _ __    #
#   | '_ \| |/ _` | '_ \ \ / /| / __| |/ _ \| '_ \  #
#   | |_) | | (_| | | | \ V / | \__ \ | (_) | | | | #
#   | .__/|_|\__,_|_| |_|\_/  |_|___/_|\___/|_| |_| #
#   |_|                                             #
#                  API and routing                  #
#                Daniel Ostrow, 2024                #
#####################################################

from flask import *
from pdf2image import convert_from_bytes
from threading import Lock
import os
import secrets
import datetime
import json

app = Flask(__name__)

MAIN_FOLDER = 'static'
UPLOAD_FOLDER = os.path.join(MAIN_FOLDER, 'converted')
DATA_FOLDER = os.path.join(MAIN_FOLDER, 'data')
COLLECTION_FOLDER = os.path.join(DATA_FOLDER, 'blobs')
ALLOWED_EXTENSIONS = {'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DATA_FOLDER'] = DATA_FOLDER
app.config['COLLECTION_FOLDER'] = COLLECTION_FOLDER

# get index.html page
@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

# check for existing folders
os.makedirs(MAIN_FOLDER, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DATA_FOLDER, exist_ok=True)
os.makedirs(COLLECTION_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# accept document type.
# convert each page to JPEG, store in static/
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        images = convert_from_bytes(file.read())
        existing_files = len(os.listdir(app.config['UPLOAD_FOLDER']))
        
        # store each page from file as JPEG
        for i, image in enumerate(images):
            image_id = existing_files + i
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], f'convertedFile_{image_id}.jpg')
            image.save(image_path, 'JPEG')
        
        return render_template('upload_success.html'), 200
    return jsonify({'error': 'Invalid file type or no file selected'}), 400

# pathing to retrieve specific files from static/
@app.route('/static/converted/<filename>')
def uploaded_file(filename):
    """Serve a file from the upload folder."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# display all converted images
@app.route('/gallery')
def gallery():
    image_files = os.listdir(app.config['UPLOAD_FOLDER'])
    images = [url_for('uploaded_file', filename=f) for f in image_files]
    return render_template('gallery.html', images=images)

# pathing for image annotation
@app.route('/editor')
def editor():
    image_path = request.args.get('img', '')
    return render_template('editor.html', image_path=image_path)

# redundancy route in-case we decide to alter file structure to better verbage
@app.route('/image/<image_id>', methods=['GET'])
def get_image(image_id):
    return send_from_directory(app.config['UPLOAD_FOLDER'], image_id)

# Begin logic for bounded images export. Initiate thread locking to keep updates
# to writable files clean.
lock = Lock()

@app.route('/data/store', methods=['POST'])
def store_data():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    dateTime = request.form.get('dateTime')
    category = request.form.get('category', 'undefined_category').replace(' ', '_').replace('/', '_')
    timestamp = datetime.datetime.fromisoformat(dateTime).strftime('%Y%m%d%H%M%S')
    # issues previously with files overwriting each other on mass export.
    # initiate random token appended to file name to avoid overwriting
    # files with the same category and collection timestamp.
    random_str = secrets.token_hex(3)

    filename = f"{category}_{timestamp}_{random_str}.png"
    file_path = os.path.join(app.config['COLLECTION_FOLDER'], filename)
    file.save(file_path)

    # Assign variables for JSON
    new_data = {
        'category': category,
        'dateTime': dateTime,
        'filePath': file_path,
        'fromImage': request.form.get('originalImagePath', 'unknown')
    }

    # Append bounded rectangle data to JSON
    data_path = os.path.join(app.config['DATA_FOLDER'], 'data.json')
    with lock:
        try:
            if os.path.exists(data_path) and os.path.getsize(data_path) > 0:
                with open(data_path, 'r+') as f:
                    try:
                        data = json.load(f)
                    except json.JSONDecodeError:
                        data = []  # if there's an error in decoding, start with an empty list
                    data.append(new_data)
                    f.seek(0)
                    json.dump(data, f, indent=4)
                    f.truncate()  # truncate to remove any leftover data
            else:
                # if file is empty, ensure it is writable and build.
                with open(data_path, 'w') as f:
                    json.dump([new_data], f, indent=4)
        except IOError as e:
            print(f"IOError: {e}")
            return jsonify({'error': 'File I/O error'}), 500
        except Exception as e:
            print(f"Exception: {e}")
            return jsonify({'error': 'An error occurred'}), 500

    return jsonify({'message': 'File and data stored successfully'}), 200

if __name__ == '__main__':
    app.run(debug=True, threaded=True)