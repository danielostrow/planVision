from flask import *
from pdf2image import convert_from_bytes
import os

app = Flask(__name__)

UPLOAD_FOLDER = 'static'
DATA_FOLDER = os.path.join(UPLOAD_FOLDER, 'data')
ALLOWED_EXTENSIONS = {'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DATA_FOLDER'] = DATA_FOLDER

# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DATA_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/static/<filename>')
def uploaded_file(filename):
    """Serve a file from the upload folder."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

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
        
        for i, image in enumerate(images):
            image_id = existing_files + i
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], f'convertedFile_{image_id}.jpg')
            image.save(image_path, 'JPEG')
        
        return render_template('upload_success.html'), 200
    return jsonify({'error': 'Invalid file type or no file selected'}), 400

@app.route('/gallery')
def gallery():
    image_files = os.listdir(app.config['UPLOAD_FOLDER'])
    images = [url_for('uploaded_file', filename=f) for f in image_files]
    return render_template('gallery.html', images=images)

@app.route('/editor')
def editor():
    image_path = request.args.get('img', '')
    return render_template('editor.html', image_path=image_path)

@app.route('/image/<image_id>', methods=['GET'])
def get_image(image_id):
    return send_from_directory(app.config['UPLOAD_FOLDER'], image_id)

@app.route('/data/store', methods=['POST'])
def store_data():
    print("Received a POST request with the following data:")
    data = request.get_json()
    if not data:
        print("No data received.")
        return jsonify({'error': 'No data provided'}), 400

    data_path = os.path.join(app.config['DATA_FOLDER'], 'data.json')
    print(f"Writing data to {data_path}")
    with open(data_path, 'w') as f:
        json.dump(data, f, indent=4)

    print("Data saved successfully.")
    return jsonify({'message': 'Data saved successfully'}), 200


if __name__ == '__main__':
    app.run(debug=True)
