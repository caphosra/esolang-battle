const React = require('react');
const {
	Button,
	Modal,
	ModalHeader,
	ModalBody,
	ModalFooter,
	Form,
	FormGroup,
	Input,
} = require('reactstrap');
const range = require('lodash/range');
const api = require('../../api.js');

const boardShape = [
	'        *****           ',
	'        *****           ',
	'    *****************   ',
	'    *****************   ',
	'*********************   ',
	'*********************   ',
	'  ********************* ',
	'    *****************   ',
	'*********************   ',
	'*********************   ',
	'  ********************* ',
	'        *********       ',
	'      *********         ',
	'                        ',
];

class App extends React.Component {
	constructor(props, context) {
		super(props, context);

		this.state = {
			code: '',
			files: [],
			faces: [],
			languages: [],
			selectedLanguage: null,
			isPending: true,
			message: null,
			messageType: 'success',
			messageDetail: null,
		};

		this.pendingSubmission = null;

		this.updateLanguages();
		this.initSocket();
	}

	initSocket = () => {
		if (!window.io) {
			setTimeout(this.initSocket, 1000);
			return;
		}

		this.socket = window.io(location.origin);
		this.socket.on('update-submission', this.handleUpdateSubmission);
		this.socket.on('update-languages', this.handleUpdateLanguages);
	};

	updateLanguages = async () => {
		const languages = await api('GET', '/contests/5/languages');
		this.setState({languages});
		this.map &&
			this.map.setFaceColors(
				languages.map((language) => {
					if (language.type === 'unknown') {
						return 'black';
					}

					if (language.team === undefined) {
						if (language.available === true) {
							return 'white';
						}
						return 'grey';
					}

					return ['red', 'blue', 'green'][language.team];
				})
			);
	};

	handleChangeCode = (event) => {
		this.setState({
			code: event.target.value,
		});
	};

	handleChangeFile = (event) => {
		this.setState({
			files: event.target.files,
		});
	};

	handleCloseModal = () => {
		this.setState({
			code: '',
			files: [],
			message: null,
			messageDetail: null,
			selectedLanguage: null,
		});
	};

	handleSend = async () => {
		if (this.state.isPending) {
			return;
		}

		this.setState({
			isPending: true,
			message: null,
			messageDetail: null,
		});

		const result = await api('POST', '/contests/5/submission', {
			language: this.state.selectedLanguage.slug,
			...(this.state.files.length > 0
				? {file: this.state.files[0]}
				: {code: this.state.code}),
		});

		if (result.error) {
			this.setState({
				message: result.error,
				messageType: 'danger',
				messageDetail: null,
				isPending: false,
			});
		}

		this.pendingSubmission = result._id;
	};

	handleUpdateSubmission = async (data) => {
		if (this.pendingSubmission !== data._id) {
			return;
		}

		this.pendingSubmission = null;
		const submission = await api('GET', '/contests/5/submission', {
			_id: data._id,
		});

		if (submission.status === 'failed') {
			this.setState({
				message: 'Submission failed.',
				messageType: 'danger',
				messageDetail: data._id,
				isPending: false,
			});
		} else if (submission.status === 'error') {
			this.setState({
				message: 'Execution timed out.',
				messageType: 'danger',
				messageDetail: data._id,
				isPending: false,
			});
		} else if (submission.status === 'success') {
			this.setState({
				message: 'You won the language!',
				messageType: 'success',
				messageDetail: data._id,
				isPending: false,
			});
		}
	};

	handleUpdateLanguages = () => {
		this.updateLanguages();
	};

	render() {
		const selectedLanguage = this.state.selectedLanguage || {};
		const cellCounts = Array(3)
			.fill()
			.map(
				(_, index) => this.state.languages.filter((language) => language.team === index)
					.length
			);
		const totalCellCounts = cellCounts.reduce((a, b) => a + b);

		return (
			<div className="world">
				<div className="spacer"/>
				<div className="map">
					<svg viewBox="0 0 14.7 15.6" className="paint">
						{range(7).map((y) => (
							<g key={y} style={{transform: `translate(${y % 2 * -1.366}px, ${y * 2.366}px)`}}>
								{range(6).map((x) => (
									<g key={x}>
										<g style={{transform: `translate(${x * 2.732}px, 0px)`}}>
											{[
												'0.5,0.5 1,1.366 0,1.366',
												'0.5,0.5 1.366,0 1.866,0.866 1,1.366',
												'1.366,0 2.366,0 1.866,0.866',
												'2.366,0 3.232,0.5 2.732,1.366 1.866,0.866',
											].map((points, i) => {
												if (boardShape[y * 2][x * 4 + i] === '*') {
													return (
														<polygon key={i} points={points} fill="black" stroke="white" strokeWidth="0.05"/>
													);
												}
												return null;
											})}
										</g>
										<g style={{transform: `translate(${x * 2.732}px, 0px)`}}>
											{[
												'0,1.366 1,1.366 1,2.366 0,2.366',
												'1,1.366 1.866,0.866 2.732,1.366 2.732,2.366 1.866,2.866 1,2.366',
											].map((points, i) => {
												if (boardShape[y * 2 + 1][x * 4 + i] === '*') {
													return (
														<polygon key={i} points={points} fill="black" stroke="white" strokeWidth="0.05"/>
													);
												}
												return null;
											})}
										</g>
									</g>
								))}
							</g>
						))}
					</svg>
					<div className="language-labels">
						{[...this.state.faces.entries()]
							.filter(([, face]) => face.z < 0.99915)
							.map(([index, face]) => (
								<div
									key={index}
									className="language-label"
									style={{
										color:
											this.state.languages[index] &&
											this.state.languages[index].team === undefined
												? '#222'
												: 'white',
										transform: `translate(${face.x}px, ${
											face.y
										}px) translate(-50%, -50%) scale(${(0.99915 - face.z) *
											3000})`,
									}}
								>
									<div className="language-name">
										{this.state.languages[index]
											? this.state.languages[index].name
											: ''}
									</div>
									<div className="language-size">
										{this.state.languages[index] &&
										this.state.languages[index].solution
											? this.state.languages[index].solution.size
											: ''}
									</div>
								</div>
							))}
					</div>
				</div>
				<div className="teams">
					{['Red', 'Blue', 'Green'].map((color, index) => (
						<div key={color} className={`team ${color.toLowerCase()}`}>
							<div
								className="bar"
								style={{
									flexBasis: `${cellCounts[index] / totalCellCounts * 100}%`,
								}}
							>
								<div className="count">{cellCounts[index]}</div>
								<div className="team-name">{color}</div>
							</div>
						</div>
					))}
				</div>
				<Modal
					isOpen={this.state.selectedLanguage !== null}
					toggle={this.handleCloseModal}
					className="language-modal"
				>
					<ModalHeader>
						{selectedLanguage.name}{' '}
						<small>
							<a href={selectedLanguage.link} target="_blank">
								[detail]
							</a>
						</small>
					</ModalHeader>
					<ModalBody>
						{selectedLanguage.solution ? (
							<React.Fragment>
								<p>
									Owner: {selectedLanguage.solution.user} ({
										selectedLanguage.team
									})
								</p>
								<p>
									{'Solution: '}
									<a
										href={`/contests/5/submissions/${
											selectedLanguage.solution._id
										}`}
										target="_blank"
									>
										{selectedLanguage.solution._id}
									</a>
									{` (${selectedLanguage.solution.size} bytes)`}
								</p>
							</React.Fragment>
						) : (
							<React.Fragment>
								<p>Owner: N/A</p>
								<p>Solution: N/A</p>
							</React.Fragment>
						)}
						<Form>
							<FormGroup
								disabled={!this.state.files || this.state.files.length === 0}
							>
								<Input
									type="textarea"
									className="code"
									value={this.state.code}
									onChange={this.handleChangeCode}
									disabled={this.state.files && this.state.files.length > 0}
								/>
							</FormGroup>
							<FormGroup>
								<Input type="file" onChange={this.handleChangeFile}/>
							</FormGroup>
						</Form>
						{this.state.message && (
							<p className={`p-3 mb-2 bg-${this.state.messageType} text-white`}>
								{this.state.message}
								{this.state.messageDetail && (
									<React.Fragment>
										{' Check out the detail '}
										<a
											href={`/contests/5/submissions/${
												this.state.messageDetail
											}`}
											target="_blank"
										>
											here
										</a>.
									</React.Fragment>
								)}
							</p>
						)}
					</ModalBody>
					<ModalFooter>
						<Button
							color="primary"
							onClick={this.handleSend}
							disabled
						>
							Send
						</Button>{' '}
						<Button color="secondary" onClick={this.handleCloseModal}>
							Cancel
						</Button>
					</ModalFooter>
				</Modal>
			</div>
		);
	}
}

module.exports = App;
