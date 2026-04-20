import * as ort from "onnxruntime-node"
import path from "path"
import fs from "fs"

export type OnnxSessions = {
  detector: ort.InferenceSession
  recognizer: ort.InferenceSession
}

declare global {
  var __onnxSessions: OnnxSessions | undefined
}

export async function getSessions(): Promise<OnnxSessions> {
  if (global.__onnxSessions) return global.__onnxSessions

  const modelsDir = path.resolve(process.cwd(), "public", "models")
  const detectorPath = path.join(modelsDir, "det_500m.onnx")
  const recognizerPath = path.join(modelsDir, "w600k_mbf.onnx")

  if (!fs.existsSync(detectorPath)) {
    throw new Error(`ONNX detector model not found at: ${detectorPath}`)
  }
  if (!fs.existsSync(recognizerPath)) {
    throw new Error(`ONNX recognizer model not found at: ${recognizerPath}`)
  }

  const [detector, recognizer] = await Promise.all([
    ort.InferenceSession.create(detectorPath, { executionProviders: ["cpu"] }),
    ort.InferenceSession.create(recognizerPath, { executionProviders: ["cpu"] }),
  ])

  global.__onnxSessions = { detector, recognizer }
  return global.__onnxSessions
}
