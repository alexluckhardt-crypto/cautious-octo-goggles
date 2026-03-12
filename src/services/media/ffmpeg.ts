// src/services/media/ffmpeg.ts
// FFmpeg wrapper for media processing operations.
// Real methods are implemented. renderFromEditPlan is stubbed.

import { spawn } from 'child_process'
import path from 'path'
import type { MediaMetadata, EditPlan } from '@/types'

export class FFmpegService {
  /**
   * Probe a video file for metadata (duration, dimensions, fps)
   * REAL IMPLEMENTATION
   */
  static async probe(filePath: string): Promise<MediaMetadata> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-show_format',
        filePath,
      ]

      const proc = spawn('ffprobe', args)
      let output = ''
      let errOutput = ''

      proc.stdout.on('data', d => { output += d })
      proc.stderr.on('data', d => { errOutput += d })

      proc.on('close', code => {
        if (code !== 0) return reject(new Error(`ffprobe failed: ${errOutput}`))
        try {
          const info = JSON.parse(output)
          const video = info.streams?.find((s: any) => s.codec_type === 'video')
          const fps = video?.r_frame_rate
            ? eval(video.r_frame_rate) // e.g. "30000/1001" → 29.97
            : undefined
          resolve({
            duration: parseFloat(info.format?.duration || '0'),
            width: video?.width,
            height: video?.height,
            fps,
            size: parseInt(info.format?.size || '0'),
            codec: video?.codec_name,
          })
        } catch (e) {
          reject(new Error('Failed to parse ffprobe output'))
        }
      })
    })
  }

  /**
   * Generate a thumbnail from a video at a given timestamp
   * REAL IMPLEMENTATION
   */
  static async thumbnail(
    inputPath: string,
    outputPath: string,
    timestamp = '00:00:01'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-ss', timestamp,
        '-vframes', '1',
        '-q:v', '2',
        '-vf', 'scale=640:-1',
        outputPath,
        '-y',
      ]

      const proc = spawn('ffmpeg', args)
      proc.on('close', code => {
        if (code === 0) resolve(outputPath)
        else reject(new Error('thumbnail generation failed'))
      })
    })
  }

  /**
   * Extract audio track from video
   * REAL IMPLEMENTATION
   */
  static async extractAudio(inputPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-vn',
        '-acodec', 'mp3',
        '-ab', '192k',
        '-ar', '44100',
        outputPath,
        '-y',
      ]

      const proc = spawn('ffmpeg', args)
      proc.on('close', code => {
        if (code === 0) resolve(outputPath)
        else reject(new Error('audio extraction failed'))
      })
    })
  }

  /**
   * Detect scene cuts in a video
   * REAL IMPLEMENTATION — returns timestamps of detected cuts
   */
  static async detectCuts(inputPath: string, threshold = 0.3): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-filter:v', `select='gt(scene,${threshold})',showinfo`,
        '-f', 'null',
        '-',
      ]

      const proc = spawn('ffmpeg', args)
      let errOutput = '' // showinfo outputs to stderr
      const cuts: number[] = []

      proc.stderr.on('data', d => {
        errOutput += d.toString()
        // Parse showinfo timestamps from stderr
        const matches = errOutput.matchAll(/pts_time:(\d+\.?\d*)/g)
        for (const m of matches) cuts.push(parseFloat(m[1]))
      })

      proc.on('close', code => {
        if (code === 0) resolve([...new Set(cuts)].sort((a, b) => a - b))
        else reject(new Error('scene detection failed'))
      })
    })
  }

  /**
   * Render final video from edit plan
   *
   * STUB — returns a placeholder URL.
   *
   * Real implementation would:
   * 1. Download source clips from storage to temp dir
   * 2. Build FFmpeg filtergraph from edit plan segments
   * 3. Concatenate clips in sequence order
   * 4. Apply zoom/pan effects per editPlan.zoom_instructions
   * 5. Overlay captions using libass subtitle filter
   * 6. Mix audio track at correct volume
   * 7. Export to 1080x1920 MP4 (TikTok vertical format)
   * 8. Upload to Supabase Storage
   * 9. Return public URL
   */
  static async renderFromEditPlan(
    inputFiles: string[],
    editPlan: EditPlan,
    outputPath: string,
    onProgress?: (pct: number) => void
  ): Promise<string> {

    // Simulate render time
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 200))
      onProgress?.(i)
    }

    // TODO: return real output path after implementing render
    return outputPath
  }

  /**
   * Build FFmpeg filtergraph string from edit plan
   * Plug real implementation in here
   */
  static buildFilterGraph(editPlan: EditPlan, inputCount: number): string {
    // TODO: Build a real concat + effect filtergraph
    // Example structure:
    // [0:v]trim=0:5,scale=1080:1920[v0];
    // [1:v]trim=0:8,scale=1080:1920[v1];
    // [v0][v1]concat=n=2:v=1:a=0[out]

    return `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920[vout]`
  }
}
