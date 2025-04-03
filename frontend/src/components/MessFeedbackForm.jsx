import { useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./form.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MessFeedbackForm = () => {
  const [formData, setFormData] = useState({
    regNo: "",
    name: "",
    blockRoom: "",
    messName: "",
    messType: "",
    category: "",
    suggestions: "",
    comments: "",
    proof: null,
  });

  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle File Upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData({ ...formData, proof: file });

    // Preview only if it's an image
    if (file && file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation for Registration Number
    if (formData.regNo.length < 5) {
      toast.error("Registration number must be at least 5 characters long! ❌");
      return;
    }

    // Validation for Block & Room Number
    if (!formData.blockRoom.includes(" ")) {
      toast.error("Block & Room number must include both block and room details! ❌");
      return;
    }

    const formDataObj = new FormData();

    // Append all form fields except proof file
    Object.keys(formData).forEach((key) => {
      if (key !== "proof") {
        //  Prevent duplicate "proof" field
        formDataObj.append(key, formData[key]);
      }
    });

    // Append proof file if it exists
    if (formData.proof) {
      formDataObj.append("proof", formData.proof);
    }

    try {
      // Show Uploading Notification
      const uploadToast = toast.loading("Uploading file...");

      const response = await fetch("http://localhost:5000/submit-feedback", {
        method: "POST",
        body: formDataObj,
      });

      const result = await response.json();

      // Remove the loading toast
      toast.dismiss(uploadToast);

      if (response.ok) {
        toast.success("Feedback submitted successfully! ✅");

        // Reset form on successful submission
        setFormData({
          regNo: "",
          name: "",
          blockRoom: "",
          messName: "",
          messType: "",
          category: "",
          suggestions: "",
          comments: "",
          proof: null,
        });

        setFilePreview(null);

        // Reset file input manually
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.error(result.message || "Submission failed! ❌");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Error submitting feedback! ❌");
    }
  };

  // Function to Download Reports
  const downloadReport = (type) => {
    window.location.href = `http://localhost:5000/generate-${type}-report`;
  };

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100 mt-4 mb-4">
      <div className="card shadow-lg p-4 w-100" style={{ maxWidth: "800px" }}>
        <h2 className="text-center main-txt">Mess Feedback Form</h2>
        <form onSubmit={handleSubmit}>
          {/* Registration No & Name */}
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Reg No:</label>
              <input
                type="text"
                className="form-control custom-input"
                name="regNo"
                value={formData.regNo}
                onChange={handleChange}
                placeholder="Enter registration number"
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Name:</label>
              <input
                type="text"
                className="form-control custom-input"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                required
              />
            </div>
          </div>

          {/* Block & Room No & Mess Name */}
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Block & Room No:</label>
              <input
                type="text"
                className="form-control custom-input"
                name="blockRoom"
                value={formData.blockRoom}
                onChange={handleChange}
                placeholder="Enter block & room number"
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Mess Name:</label>
              <input
                type="text"
                className="form-control custom-input"
                name="messName"
                value={formData.messName}
                onChange={handleChange}
                placeholder="Enter mess name"
                required
              />
            </div>
          </div>

          {/* Mess Type & Category */}
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Type of Mess:</label>
              <select
                className="form-select custom-select"
                name="messType"
                value={formData.messType}
                onChange={handleChange}
                required
              >
                <option value="">Select Type</option>
                <option value="Veg">Veg</option>
                <option value="Non-Veg">Non-Veg</option>
                <option value="Special">Special</option>
                <option value="Night Mess">Night Mess</option>
              </select>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Category:</label>
              <select
                className="form-select custom-select"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
                <option value="Quality">Quality</option>
                <option value="Quantity">Quantity</option>
                <option value="Hygiene">Hygiene</option>
                <option value="Mess Timing">Mess Timing</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          {/* Suggestions & Comments */}
          <div className="mb-3">
            <label className="form-label">Suggestions:</label>
            <textarea
              className="form-control custom-input"
              name="suggestions"
              value={formData.suggestions}
              onChange={handleChange}
              placeholder="Enter your suggestions"
              rows="3"
            ></textarea>
          </div>
          <div className="mb-3">
            <label className="form-label">Comments:</label>
            <textarea
              className="form-control custom-input"
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              placeholder="Enter additional comments"
              rows="3"
            ></textarea>
          </div>

          {/* File Upload Section */}
          <div className="input-group">
            <label className="form-label">Upload Proof (Optional):</label>

            <div className="file-upload-container">
              {/* Custom File Upload Button */}
              <label className="file-upload-btn">
                <span className="upload-icon">📂</span> Choose File
                <input
                  type="file"
                  className="file-upload-input"
                  name="proof"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.jpg,.jpeg,.png"
                />
              </label>

              {/* Show Selected File Name */}
              {formData.proof && (
                <p className="file-name">{formData.proof.name}</p>
              )}
            </div>

            {/* Image Preview */}
            {filePreview && (
              <div className="preview-container">
                <p>Preview:</p>
                <img src={filePreview} alt="Preview" className="preview-img" />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              className="btn btn-primary custom-button bot p-2"
            >
              Submit Feedback
            </button>
          </div>
        </form>

        {/* Download Report Buttons */}
        <div className="text-center mt-4">
          <h5 className="mb-3">Download Reports</h5>
          <button
            className="btn btn-success mx-2 p-2 bot"
            onClick={() => downloadReport("excel")}
          >
            Download Excel Report
          </button>
          <button
            className="btn btn-danger mx-2 p-2 bot"
            onClick={() => downloadReport("pdf")}
          >
            Download PDF Report
          </button>
        </div>
      </div>
      {/* Toaster Container */}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default MessFeedbackForm;
