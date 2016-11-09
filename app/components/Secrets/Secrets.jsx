import React, { PropTypes } from 'react';
import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import { List, ListItem } from 'material-ui/List';
import Edit from 'material-ui/svg-icons/editor/mode-edit';
import Copy from 'material-ui/svg-icons/action/assignment';
import Checkbox from 'material-ui/Checkbox';
import styles from './secrets.css';
import _ from 'lodash';
import copy from 'copy-to-clipboard';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import TextField from 'material-ui/TextField';
import { green500, green400, red500, red300, yellow500, white } from 'material-ui/styles/colors.js'
import axios from 'axios';

const copyEvent = new CustomEvent("snackbar", {
    detail: {
        message: 'Copied!'
    }
});

class Secrets extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            openEditModal: false,
            openNewKeyModal: false,
            newKeyErrorMessage: '',
            openDeleteModal: false,
            editingKey: -1,
            deletingKey: '',
            secrets: [],
            currentSecret: '',
            namespace: '/'
        };

        this.getSecrets = this.getSecrets.bind(this);
        this.renderSecrets = this.renderSecrets.bind(this);
        this.renderNamespace = this.renderNamespace.bind(this);
        this.clickSecret = this.clickSecret.bind(this);
        this.renderEditDialog = this.renderEditDialog.bind(this);
        this.renderNewKeyDialog = this.renderNewKeyDialog.bind(this);
        this.renderDeleteConfirmationDialog = this.renderDeleteConfirmationDialog.bind(this);
        this.copyText = this.copyText.bind(this);
        this.deleteKey = this.deleteKey.bind(this);
    }

    componentDidMount() {
        this.getSecrets("/");
    }

    copyText(value) {
        copy(value);
        document.dispatchEvent(copyEvent);
    }

    deleteKey(key) {

        let fullKey = `${this.state.namespace}${key}`;
        axios.delete(`/secret?vaultaddr=${encodeURI(window.localStorage.getItem("vaultUrl"))}&secret=${encodeURI(fullKey)}&token=${encodeURI(window.localStorage.getItem("vaultAccessToken"))}`)
            .then((resp) => {
                if (resp.status !== 204) {
                    console.error(resp.status);
                } else {
                    let secrets = this.state.secrets;
                    let secretToDelete = _.find(secrets, (secretToDelete) => { return secretToDelete.key == key; });
                    secrets = _.pull(secrets, secretToDelete);
                    this.setState({
                        secrets: secrets
                    });
                }
            })
            .catch((err) => {
                console.error(err.stack);
            });

        this.setState({
            deletingKey: '',
            openDeleteModal: false
        });
    }

    renderEditDialog() {
        const actions = [
            <FlatButton label="Cancel" primary={true} onTouchTap={() => this.setState({ openEditModal: false })} />,
            <FlatButton label="Submit" primary={true} onTouchTap={() => this.updatePolicy()} />
        ];

        let updatePolicy = () => {
            let fullKey = `${this.state.namespace}${this.state.editingKey}`;
            axios.post(`/secret?vaultaddr=${encodeURI(window.localStorage.getItem("vaultUrl"))}&secret=${encodeURI(fullKey)}&token=${encodeURI(window.localStorage.getItem("vaultAccessToken"))}`, { "VaultUrl": window.localStorage.getItem("vaultUrl"), "SecretValue": this.state.newSecret })
                .then((resp) => {
                    if (resp.status === 200) {

                    } else {
                        // errored
                    }
                })
                .catch((err) => {
                    console.error(err.stack);
                })

            this.setState({ openEditModal: false });
        }


        let secretChanged = (e, v) => {
            this.state.newSecret = e.target.value;
        }

        return (
            <Dialog
                title={`Editing ${this.state.editingKey}`}
                modal={false}
                actions={actions}
                open={this.state.openEditModal}
                onRequestClose={() => this.setState({ openEditModal: false })}
                autoScrollBodyContent={true}
                >
                <TextField
                    onChange={(e, v) => secretChanged(e, v)}
                    name="editingText"
                    autoFocus
                    multiLine={true}
                    defaultValue={this.state.currentSecret}
                    fullWidth={true} />
            </Dialog>
        );
    }

    renderDeleteConfirmationDialog() {
        const actions = [
            <FlatButton label="Cancel" primary={true} onTouchTap={() => this.setState({ openDeleteModal: false, deletingKey: '' })} />,
            <FlatButton label="Delete" style={{ color: white }} hoverColor={red300} backgroundColor={red500} primary={true} onTouchTap={() => this.deleteKey(this.state.deletingKey)} />
        ];

        return (
            <Dialog
                title={`Delete Confirmation`}
                modal={false}
                actions={actions}
                open={this.state.openDeleteModal}
                onRequestClose={() => this.setState({ openDeleteModal: false, newKeyErrorMessage: '' })}
                >

                <p>You are about to permanently delete {this.state.deletingKey}.  Are you sure?</p>
                <em>To disable this prompt, visit the settings page.</em>
            </Dialog>
        )
    }

    renderNewKeyDialog() {
        const MISSING_KEY_ERROR = "Key cannot be empty.";
        const DUPLICATE_KEY_ERROR = `Key ${this.state.newKey.key} already exists.`;

        let validateAndSubmit = () => {
            if (this.state.newKey.key === '') {
                this.setState({
                    newKeyErrorMessage: MISSING_KEY_ERROR
                });
                return;
            }

            if (_.filter(this.state.secrets, x => x.key === this.state.newKey.key).length > 0) {
                this.setState({
                    newKeyErrorMessage: DUPLICATE_KEY_ERROR
                });
                return;
            }

            let fullKey = `${this.state.namespace}${this.state.newKey.key}`;
            axios.post(`/secret?vaultaddr=${encodeURI(window.localStorage.getItem("vaultUrl"))}&secret=${encodeURI(fullKey)}&token=${encodeURI(window.localStorage.getItem("vaultAccessToken"))}`, { "VaultUrl": window.localStorage.getItem("vaultUrl"), "SecretValue": this.state.newKey.value })
                .then((resp) => {
                    if (resp.status === 200) {
                        let secrets = this.state.secrets;
                        let key = this.state.newKey.key.includes('/') ? `${this.state.newKey.key.split('/')[0]}/` : this.state.newKey.key;
                        secrets.push({ key: key, value: this.state.newKey.value });
                        this.setState({
                            secrets: secrets,
                            namespace: fullKey
                        });
                    } else {
                        // errored
                    }
                })
                .catch((err) => {
                    console.error(err.stack);
                })

            this.setState({ openNewKeyModal: false, newKeyErrorMessage: '' });
        }

        const actions = [
            <FlatButton label="Cancel" primary={true} onTouchTap={() => this.setState({ openNewKeyModal: false, newKeyErrorMessage: '' })} />,
            <FlatButton label="Submit" primary={true} onTouchTap={validateAndSubmit} />
        ];

        let setNewKey = (e, v) => {
            let currentKey = this.state.newKey;
            if (e.target.name === "newKey") {
                currentKey.key = v;
            } else if (e.target.name === "newValue") {
                currentKey.value = v;
            }
            this.setState({
                newKey: currentKey
            });
        }

        return (
            <Dialog
                title={`New Key`}
                modal={false}
                actions={actions}
                open={this.state.openNewKeyModal}
                onRequestClose={() => this.setState({ openNewKeyModal: false, newKeyErrorMessage: '' })}
                autoScrollBodyContent={true}
                >
                <TextField name="newKey" autoFocus fullWidth={true} hintText="Key" onChange={(e, v) => setNewKey(e, v)} />
                <TextField
                    name="newValue"
                    multiLine={true}
                    fullWidth={true}
                    style={{ height: '5000px' }}
                    hintText="Value"
                    onChange={(e, v) => setNewKey(e, v)} />
                <div className={styles.error}>{this.state.newKeyErrorMessage}</div>
            </Dialog>
        );
    }

    getSecrets(namespace) {
        var keys = [];
        axios.get(`/listsecrets?vaultaddr=${encodeURI(window.localStorage.getItem("vaultUrl"))}&token=${encodeURI(window.localStorage.getItem("vaultAccessToken"))}&namespace=${encodeURI(namespace)}`)
            .then((resp) => {
                let keys = resp.data.data.keys;

                var secrets = _.map(keys, (key) => {
                    return {
                        key: key
                    }
                });

                this.setState({
                    namespace: namespace,
                    secrets: secrets
                });
            })
            .catch((err) => {
                console.error(err.stack);
            });
    }

    clickSecret(key, isFullPath) {
        let isDir = key[key.length - 1] === '/';
        if (isDir) {
            if (isFullPath) {
                this.getSecrets(`${key}`);
            } else {
                this.getSecrets(`${this.state.namespace}${key}`);
            }
        } else {
            let fullKey = `${this.state.namespace}${key}`;
            axios.get(`/secret?vaultaddr=${encodeURI(window.localStorage.getItem("vaultUrl"))}&secret=${encodeURI(fullKey)}&token=${encodeURI(window.localStorage.getItem("vaultAccessToken"))}`)
                .then((resp) => {
                    let val = typeof resp.data.value == 'object' ? JSON.stringify(resp.data.value) : resp.data.value;
                    this.setState({
                        openEditModal: true,
                        editingKey: key,
                        currentSecret: val
                    });
                })
                .catch((err) => {
                    console.error(err.stack);
                });

        }
    }

    showDelete(key) {
        if (key[key.length - 1] === '/') {
            return (<IconButton />);
        } else {
            return (
                <IconButton
                    tooltip="Delete"
                    onTouchTap={() => {
                        if (window.localStorage.getItem("showDeleteModal") === 'false') {
                            this.deleteKey(key);
                        } else {
                            this.setState({ deletingKey: key, openDeleteModal: true })
                        }
                    } }
                    >
                    <FontIcon className="fa fa-times-circle" color={red500} />
                </IconButton>);
        }
    }

    renderSecrets() {
        return _.map(this.state.secrets, (secret) => {
            return (
                <ListItem
                    style={{ marginLeft: -17 }}
                    key={secret.key}
                    onTouchTap={() => { this.clickSecret(secret.key) } }
                    primaryText={<div className={styles.key}>{secret.key}</div>}
                    //secondaryText={<div className={styles.key}>{secret.value}</div>}
                    rightIconButton={this.showDelete(secret.key)}>
                </ListItem>
            );
        });
    }

    renderNamespace() {
        // if (this.state.namespace === '/') {
        //     return (
        //         <div style={{ display: 'inline-block' }} key={'/'}>
        //             <span className={styles.link}
        //                 onTouchTap={() => this.clickSecret("/", true)}>ROOT</span>
        //         </div>);
        // }
        let namespaceParts = this.state.namespace.split('/');
        return (
            _.map(namespaceParts, (dir, index) => {
                if (index === 0) {
                    return (
                        <div style={{ display: 'inline-block' }} key={index}>
                            <span className={styles.link}
                                onTouchTap={() => this.clickSecret("/", true)}>ROOT</span>
                            {index !== namespaceParts.length - 1 && <span>/</span>}
                        </div>
                    );
                }
                var link = [].concat(namespaceParts).slice(0, index + 1).join('/') + '/';
                return (
                    <div style={{ display: 'inline-block' }} key={index}>
                        <span className={styles.link}
                            onTouchTap={() => this.clickSecret(link, true)}>{dir.toUpperCase()}</span>
                        {index !== namespaceParts.length - 1 && <span>/</span>}
                    </div>
                );
            })
        );
    }

    render() {
        return (
            <div>
                {this.state.openEditModal && this.renderEditDialog()}
                {this.state.openNewKeyModal && this.renderNewKeyDialog()}
                {this.state.openDeleteModal && this.renderDeleteConfirmationDialog()}
                <h1 id={styles.welcomeHeadline}>Secrets</h1>
                <p>Here you can view, update, and delete keys stored in your Vault.  Just remember, <span className={styles.error}>deleting keys cannot be undone!</span></p>
                <FlatButton
                    label="Add Key"
                    backgroundColor={green500}
                    hoverColor={green400}
                    labelStyle={{ color: white }}
                    onTouchTap={() => this.setState({ openNewKeyModal: true, newKey: { key: '', value: '' } })} />
                <div className={styles.namespace}>{this.renderNamespace()}</div>
                <List>
                    {this.renderSecrets()}
                </List>
            </div>
        );
    }
}

export default Secrets;
