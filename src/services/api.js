/**
 * Deep CargoVision — API Service Layer
 * Handles communication between the React frontend and FastAPI backend.
 */

const API_BASE = "http://localhost:8000";

/**
 * Run YOLO inference on a single uploaded image file.
 * @param {File} file - Raw image file from the file input
 * @param {File | null} csvFile - Optional CSV manifest file
 * @returns {Promise<{detections: Array, image_width: number, image_height: number}>}
 */
export async function runYoloInference(file, csvFile = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (csvFile) {
    formData.append("csv_file", csvFile);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Server error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new Error("Cannot reach the backend at http://localhost:8000. Start the FastAPI server and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Run YOLO batch inference on multiple image files.
 * @param {FileList | File[]} files - Multiple image files
 * @returns {Promise<BatchResult>}
 */
export async function runYoloBatchInference(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  // Batch can take longer — 120s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(`${API_BASE}/predict-batch`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Server error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Batch request timed out. Try fewer images.");
    }
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new Error("Cannot reach the backend at http://localhost:8000. Start the FastAPI server and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check if the backend is reachable.
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Run EfficientNet two-stage pipeline on a single image.
 * @param {File} file - Raw image file from the file input
 * @returns {Promise<{detections: Array, image_width: number, image_height: number}>}
 */
export async function runEfficientNetInference(file) {
  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(`${API_BASE}/predict-efficientnet`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Server error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Run EfficientNet two-stage pipeline on multiple images.
 * @param {FileList | File[]} files - Multiple image files
 * @returns {Promise<BatchResult>}
 */
export async function runEfficientNetBatchInference(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  // Batch can take longer — 120s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(`${API_BASE}/predict-batch-efficientnet`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Server error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Batch request timed out. Try fewer images.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Run wildlife smuggling detection on a single image.
 * Detects reptiles and birds for wildlife smuggling detection.
 * @param {File} file - Raw image file from the file input
 * @returns {Promise<{detections: Array, image_width: number, image_height: number}>}
 */
export async function runWildlifeInference(file) {
  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(`${API_BASE}/predict-wildlife`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Server error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Run wildlife smuggling detection on multiple images.
 * @param {FileList | File[]} files - Multiple image files
 * @returns {Promise<BatchResult>}
 */
export async function runWildlifeBatchInference(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  // Batch can take longer — 120s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(`${API_BASE}/predict-batch-wildlife`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Server error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Batch request timed out. Try fewer images.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Run liquid detection on a single image.
 * Detects liquid containers like bottles, cans, spray cans, etc.
 * @param {File} file - Raw image file from the file input
 * @returns {Promise<{detections: Array, image_width: number, image_height: number}>}
 */
export async function runLiquidDetectionInference(file) {
  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(`${API_BASE}/predict-liquid`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Server error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Run liquid detection on multiple images.
 * @param {FileList | File[]} files - Multiple image files
 * @returns {Promise<BatchResult>}
 */
export async function runLiquidDetectionBatchInference(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  // Batch can take longer — 120s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(`${API_BASE}/predict-batch-liquid`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Server error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Batch request timed out. Try fewer images.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
