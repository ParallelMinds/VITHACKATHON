/**
 * Model + Inference Mode Configuration
 * Controls which dashboard sections are visible for each combination.
 * 
 * Key format: `${model}_${mode}` (e.g. "yolo_single", "efficientnet_batch")
 */

export const modelConfig = {
  // ─── YOLO + Single Inference ──────────────────────────────────────────
  yolo_single: {
    label: "Standard Fast Scan · Single Bag",
    showImageViewer: true,
    showRiskPanel: true,
    showDetectionConfidence: true,
    showObjectDetection: true,
    showSharpObjectDetection: true,

    showAnomalyDetection: false,
    showMisdeclaration: false,
    showMaterialAnalysis: false,
    showWetDry: false,

    showExplanations: true,
    showSubsystemDiagnostics: true,

    // Filter explanations to only 'Potential sharp object detected'
    allowedExplanationIds: [1],

    // Restrict bounding boxes to specific object classes
    allowedBoxLabels: ["Suspicious Object", "Sharp Object"],

    // Simplify risk panel metrics
    allowedMetrics: ["Detection Confidence", "Overall Risk Score"],

    // UI flags
    showActiveSensorFeed: false,

    // Filter subsystem diagnostics to only relevant modules
    allowedModuleIds: [1, 2], // Automated Screening, Object Detection
  },

  // ─── YOLO + Batch Inference ───────────────────────────────────────────
  yolo_batch: {
    label: "Standard Fast Scan · Multi-Bag",
    showImageViewer: true,
    showRiskPanel: true,
    showDetectionConfidence: true,
    showObjectDetection: true,
    showSharpObjectDetection: true,

    showAnomalyDetection: false,
    showMisdeclaration: false,
    showMaterialAnalysis: false,
    showWetDry: false,

    showExplanations: true,
    showSubsystemDiagnostics: true,

    allowedExplanationTypes: ["object_detection", "manifest"],
    allowedModuleIds: [1, 2],
  },

  // ─── EfficientNet + Single Inference ──────────────────────────────────
  efficientnet_single: {
    label: "Deep Forensic Scan · Single Bag",
    showImageViewer: true,
    showRiskPanel: true,
    showDetectionConfidence: true,
    showObjectDetection: true,
    showSharpObjectDetection: true,

    showAnomalyDetection: false,
    showMisdeclaration: false,
    showMaterialAnalysis: false,
    showWetDry: false,

    showExplanations: true,
    showSubsystemDiagnostics: true,

    // Classification specific explanation IDs
    allowedExplanationIds: [9, 10],

    // Restrict bounding boxes to specific classification classes
    allowedBoxLabels: ["Plastic Bottle", "Spray Can", "Metallic Fragment"],
    
    // Style marker for ImageViewer
    boxStyle: "classification",

    // Simplify risk panel metrics
    allowedMetrics: ["Detection Confidence", "Overall Risk Score"],

    // UI flags
    showActiveSensorFeed: false,

    // Filter subsystem diagnostics to only relevant modules
    allowedModuleIds: [1, 6], // Automated Screening, Object Classification
  },

  // ─── EfficientNet + Batch Inference ───────────────────────────────────
  efficientnet_batch: {
    label: "Deep Forensic Scan · Multi-Bag",
    showImageViewer: true,
    showRiskPanel: true,
    showDetectionConfidence: true,
    showObjectDetection: true,
    showSharpObjectDetection: true,

    showAnomalyDetection: true,
    showMisdeclaration: true,
    showMaterialAnalysis: true,
    showWetDry: true,

    showExplanations: true,
    showSubsystemDiagnostics: true,

    allowedExplanationTypes: null,
    allowedModuleIds: null,
  },

  // ─── Wildlife Smuggling Detection + Single Inference ──────────────────────────
  wildlife_single: {
    label: "Wildlife Smuggling Scan · Single Bag",
    showImageViewer: true,
    showRiskPanel: true,
    showDetectionConfidence: true,
    showObjectDetection: true,
    showSharpObjectDetection: false,

    showAnomalyDetection: false,
    showMisdeclaration: false,
    showMaterialAnalysis: false,
    showWetDry: false,

    showExplanations: true,
    showSubsystemDiagnostics: true,

    allowedExplanationIds: [11],

    // Restrict to wildlife classes
    allowedBoxLabels: ["Reptile", "Bird", "Mammal", "Organic Mass"],

    // Risk panel metrics
    allowedMetrics: ["Detection Confidence", "Overall Risk Score"],

    // UI flags
    showActiveSensorFeed: false,

    // Filter subsystem diagnostics
    allowedModuleIds: [1, 3], // Automated Screening, Wildlife Detection
  },

  // ─── Wildlife Smuggling Detection + Batch Inference ───────────────────────────
  wildlife_batch: {
    label: "Wildlife Smuggling Scan · Multi-Bag",
    showImageViewer: true,
    showRiskPanel: true,
    showDetectionConfidence: true,
    showObjectDetection: true,
    showSharpObjectDetection: false,

    showAnomalyDetection: false,
    showMisdeclaration: false,
    showMaterialAnalysis: false,
    showWetDry: false,

    showExplanations: true,
    showSubsystemDiagnostics: true,

    allowedExplanationTypes: ["wildlife_detection"],
    allowedModuleIds: [1, 3],
  },

  // ─── Liquid Detection + Single Inference ──────────────────────────────────────
  liquid_single: {
    label: "Liquid Container Detection · Single Bag",
    showImageViewer: true,
    showRiskPanel: true,
    showDetectionConfidence: true,
    showObjectDetection: true,
    showSharpObjectDetection: false,

    showAnomalyDetection: false,
    showMisdeclaration: false,
    showMaterialAnalysis: false,
    showWetDry: false,

    showExplanations: true,
    showSubsystemDiagnostics: true,

    // Restrict to liquid container classes
    allowedBoxLabels: ["Cans", "CartonDrinks", "GlassBottle", "PlasticBottle", "SprayCans", "Tin", "VacuumCup"],

    // Risk panel metrics
    allowedMetrics: ["Detection Confidence", "Overall Risk Score"],

    // UI flags
    showActiveSensorFeed: false,

    // Filter subsystem diagnostics
    allowedModuleIds: [1, 4], // Automated Screening, Liquid Detection
  },

  // ─── Liquid Detection + Batch Inference ───────────────────────────────────────
  liquid_batch: {
    label: "Liquid Container Detection · Multi-Bag",
    showImageViewer: true,
    showRiskPanel: true,
    showDetectionConfidence: true,
    showObjectDetection: true,
    showSharpObjectDetection: false,

    showAnomalyDetection: false,
    showMisdeclaration: false,
    showMaterialAnalysis: false,
    showWetDry: false,

    showExplanations: true,
    showSubsystemDiagnostics: true,

    allowedExplanationTypes: ["liquid_detection"],
    allowedModuleIds: [1, 4],
  },
};

/**
 * Returns the config for a given model+mode combination.
 * Falls back to showing everything if no match is found.
 */
export function getModelConfig(model, mode) {
  const key = `${model}_${mode}`;
  return modelConfig[key] || null;
}
