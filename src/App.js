import React, { useState, useEffect, useRef } from 'react'
import Webcam from 'react-webcam'
import * as faceapi from 'face-api.js'
const MODEL_URL = process.env.PUBLIC_URL + '/models'

const App = () => {
	const webcamRef = useRef()
	const canvasRef = useRef()
	const imgRef = useRef()
	const faceMatcherRef = useRef()
	const labeledDescriptors = useRef()
	const nameRef = useRef()
	const [imgUrl, setImgUrl] = useState(require('./1.jpg'))
	useEffect(() => {
		init()
	}, [])

	const init = async () => {
		return new Promise(async resolve => {
			await faceapi.loadTinyFaceDetectorModel(MODEL_URL)
			await faceapi.loadFaceLandmarkTinyModel(MODEL_URL)
			await faceapi.loadFaceRecognitionModel(MODEL_URL)
			labeledDescriptors.current = []
			resolve()
		})
	}

	const handleDetect = async () => {
		const video = webcamRef.current.video
		const ctx = canvasRef.current.getContext('2d')
		const videoActualSize = video.getBoundingClientRect()
		const displaySize = {
			width: videoActualSize.width,
			height: videoActualSize.height
		}
		canvasRef.current.width = displaySize.width
		canvasRef.current.height = displaySize.height
		faceapi.matchDimensions(ctx, displaySize)
		const options = new faceapi.TinyFaceDetectorOptions({
			inputSize: 128,
			scoreThreshold: 0.5
		})
		setInterval(async () => {
			const detections = await faceapi
				.detectAllFaces(video, options)
				.withFaceLandmarks(true)
				.withFaceDescriptors()
			const resizedDetections = faceapi.resizeResults(detections, displaySize)
			ctx.clearRect(0, 0, displaySize.width, displaySize.height)
			if (resizedDetections.length > 0) {
				resizedDetections.forEach(dect => {
					const box = {
						x: dect.detection._box.x,
						y: dect.detection._box.y,
						width: dect.detection._box.width,
						height: dect.detection._box.height
					}
					if (faceMatcherRef.current) {
						const bestMatch = faceMatcherRef.current.findBestMatch(
							dect.descriptor
						)
						const drawOptions = {
							label: bestMatch.toString(),
							lineWidth: 2
						}
						const drawBox = new faceapi.draw.DrawBox(box, drawOptions)
						drawBox.draw(ctx)
					} else {
						const drawOptions = {
							label: 'Unknown',
							lineWidth: 2
						}
						const drawBox = new faceapi.draw.DrawBox(box, drawOptions)
						drawBox.draw(ctx)
					}
				})
			}
		}, 100)
	}

	const handleImageChange = async () => {
		await handleImageLoad()
			.then(() => {
				faceMatcherRef.current = new faceapi.FaceMatcher(
					labeledDescriptors.current
				)
			})
			.catch(err => console.error)
	}

	const handleImageLoad = () => {
		return new Promise(async resolve => {
			const options = new faceapi.TinyFaceDetectorOptions({
				inputSize: 128,
				scoreThreshold: 0.5
			})
			const results = await faceapi
				.detectSingleFace(imgRef.current, options)
				.withFaceLandmarks(true)
				.withFaceDescriptor()

			await addNewLabelDescriptor(results)
			console.log(labeledDescriptors.current)
			resolve()
		})
	}

	function urltoFile(url, filename, mimeType) {
		return fetch(url)
			.then(function(res) {
				return res.arrayBuffer()
			})
			.then(function(buf) {
				return new File([buf], filename, { type: mimeType })
			})
	}

	const capture = React.useCallback(() => {
		const imageSrc = webcamRef.current.getScreenshot()
		urltoFile(imageSrc, 'sample.jpg', 'text/plain').then(async function(file) {
			await setImgUrl(URL.createObjectURL(file))
			await handleImageChange()
		})
	}, [webcamRef])

	const addNewLabelDescriptor = results => {
		return new Promise((resolve, reject) => {
			if (results) {
				const descriptor = results.descriptor
				const name = nameRef.current.value
				if (
					labeledDescriptors.current.findIndex(data => data.label === name) ===
					-1
				) {
					labeledDescriptors.current.push(
						new faceapi.LabeledFaceDescriptors(name, [descriptor])
					)
				} else {
					const oldLabel = labeledDescriptors.current.find(
						data => data.label === name
					)
					const oldLabelIndex = labeledDescriptors.current.findIndex(
						data => data.label === name
					)
					labeledDescriptors.current.splice(oldLabelIndex, 1)
					labeledDescriptors.current.push(
						new faceapi.LabeledFaceDescriptors(name, [
							...oldLabel.descriptors,
							descriptor
						])
					)
				}
				resolve()
			} else {
				reject('Please try again')
			}
		})
	}

	return (
		<div className='flex h-screen flex-col justify-center items-center'>
			<img src={imgUrl} ref={imgRef} style={{ width: 400 }} alt='for nothing' />

			<div className='flex justify-center items-center'>
				<button
					onClick={capture}
					className='bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 border-b-4 border-blue-700 hover:border-blue-500 rounded w-20 m-2'
				>
					Take Image
				</button>
				<button
					onClick={handleDetect}
					className='bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 border-b-4 border-blue-700 hover:border-blue-500 rounded  w-20 m-2'
				>
					Detect
				</button>

				<input
					type='text'
					ref={nameRef}
					className='border-blue-400 px-2 border-b-4'
					placeholder='enter your name'
				/>
			</div>
			<div className='relative ml-5'>
				<Webcam
					audio={false}
					width={400}
					ref={webcamRef}
					screenshotFormat='image/jpeg'
				/>
				<canvas ref={canvasRef} className='absolute top-0 left-0'></canvas>
			</div>
		</div>
	)
}

export default App
