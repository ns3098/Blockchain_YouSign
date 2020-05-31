import React, { Component } from "react";
import factory from "./contracts/DocumentFactory.json";
import Document from "./contracts/Document.json";
import getWeb3 from "./getWeb3";
import Layout from './components/Layout';
import { withRouter } from 'react-router-dom';
import { Button, Card, Icon, Header, Grid, Form, Loader, Message, Container, Image } from 'semantic-ui-react';


//IPFS
const ipfsClient = require('ipfs-http-client');
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });

class Show extends Component {
    state = {
        web3: null,
        torus: null,
        account: null,
        contract: null,
        documents: null,
        loginLoad: false,
        items: null,
        buffer: null,
        showUpload: false,
        chosenFile: "Upload Document", //Initial prompt
        init: false,
        pageLoad: false,
        submitLoad: false,
        reLogin: false,
        username: null,
        userImage: null
    };

    //For upload file reference
    fileInputRef = React.createRef();

    componentDidMount = async () => {
        const checkTorus = window.sessionStorage.getItem('torusLogged');
        console.log(checkTorus);
        if (checkTorus == 1) {
            console.log(checkTorus);
            console.log("Here!")
            this.setState({ reLogin: true });
            this.initialize();
        }
    };

    //Setup Torus with web3
    initialize = async () => {

        try {
            this.setState({ loginLoad: true });

            const web3Obj = await getWeb3();
            const web3 = web3Obj.web3;
            const torus = web3Obj.torus;

            // Use web3 to get the user's accounts.
            let accounts = await web3.eth.getAccounts();

            console.log(accounts[0]);

            // Get the contract instance.
            const networkId = await web3.eth.net.getId();
            const deployedNetwork = factory.networks[networkId];
            const instance = new web3.eth.Contract(
                factory.abi,
                deployedNetwork && deployedNetwork.address,
            );

            const account = accounts[0];

            const username = window.sessionStorage.getItem('username');
            const userImage = window.sessionStorage.getItem('userImage');

            this.setState({ web3, account, contract: instance, userImage, username, torus });

            this.setState({ loginLoad: false, pageLoad: true, reLogin: false });

            const documents = await this.state.contract.methods.getDocuments(this.state.account).call();
            documents.reverse();

            this.setState({ documents });

            this.renderDocuments();
        } catch (error) {
            console.error(error);
            this.setState({ loginLoad: false });
        }
    }

    logout = async () => {
        await this.state.torus.logout();
        window.sessionStorage.setItem('torusLogged', 0);
        this.props.history.push('/');
        window.location.reload();
    }

    //Render the owned docs
    renderDocuments = async () => {


        if (!this.state.documents)
            return null;

        console.log(this.state.documents);

        const items_promise = this.state.documents.map(async (address) => {

            let document = new this.state.web3.eth.Contract(Document.abi, address);
            let name = await document.methods.name().call();
            let desc = await document.methods.description().call();
            let url = await document.methods.ipfs_hash().call();
            let left = await document.methods.left().call();
            let add = await document.options.address;

            url = 'https://ipfs.io/ipfs/' + url;
            add = "/" + add;

            let itemObject = {
                href: add,
                header: <div><Header as="h2" color="black">{name}
                    <Header.Subheader>Pending <Icon.Group size="small"><Icon color="grey" name="wait" /></Icon.Group></Header.Subheader>
                </Header></div>,
                description: desc,
                meta: <a href={url}>View Document</a>,
                fluid: true
            }

            if (left == 0)
                itemObject.header = <div><Header as="h2" color="black">{name}  <Icon.Group size="small"><Icon color="green" name="check circle" /></Icon.Group>
                </Header></div>

            return itemObject;
        });

        const items = await Promise.all(items_promise);

        this.setState({ items, init: true, pageLoad: false });
    }

    //Uploaded File check
    onFileChange = (event) => {
        event.preventDefault();

        const file = event.target.files[0];
        const reader = new window.FileReader();
        reader.readAsArrayBuffer(file);
        reader.onloadend = () => {
            this.setState({ chosenFile: file.name, buffer: Buffer(reader.result) });
        };
    }

    onSubmit = async (event) => {
        event.preventDefault();

        this.setState({ submitLoad: true });

        for await (const file of ipfs.add(this.state.buffer)) {
            this.props.history.push({
                pathname: '/new',
                state: { ipfs: file.path }
            });
        }
    }


    render() {
        return (
            <Layout name={this.state.username} image={this.state.userImage} logout={this.logout} account={this.state.account}>
                {!this.state.account && !this.state.reLogin &&
                    <Grid verticalAlign='middle' style={{ marginTop: '-3em' }}>
                        <Grid.Column width={8}>
                            <Image src={require('./logoMain.png')} fluid />
                        </Grid.Column>
                        <Grid.Column textAlign="center" width={8}>
                            <Header as="h1">Digitally Sign any document over the Blockchain</Header>
                            <p style={{ fontSize: '1.2em' }}>You Sign is a blockchain based document signing application which enables users to digitally sign and verify documents.</p>
                            <Button size="big" secondary loading={this.state.loginLoad} onClick={this.initialize}>Sign In</Button>
                        </Grid.Column>
                    </Grid>
                }

                {this.state.init &&
                    <Grid>
                        <Grid.Row>
                            <Grid.Column width={12}>
                                <Header style={{ marginTop: '0.4em' }} as="h1" textAlign="center"><Icon name="file alternate outline" />Your Documents</Header>
                                {this.state.documents.length == 0 && <Message style={{ marginTop:"2.4em" ,textAlign: "center" }}>You do not have any document.</Message>}
                                <Card.Group style={{ marginTop: '1.5em' }} itemsPerRow={2} items={this.state.items} />
                            </Grid.Column>
                            <Grid.Column width={4} style={{ marginTop: '6.3em' }}>

                                {!this.state.showUpload && <Button fluid content="New Document" icon="add" secondary onClick={() => this.setState({ showUpload: true })} />}

                                <Form hidden={!this.state.showUpload} onSubmit={this.onSubmit}>
                                    <Form.Field>
                                        <Button
                                            fluid
                                            type="button"
                                            content={this.state.chosenFile}
                                            labelPosition="left"
                                            icon="file"
                                            onClick={() => this.fileInputRef.current.click()}
                                        />
                                        <input
                                            ref={this.fileInputRef}
                                            type="file"
                                            hidden
                                            onChange={this.onFileChange} />
                                    </Form.Field>
                                    <Button type="submit" loading={this.state.submitLoad} fluid secondary>Submit</Button>
                                </Form>

                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                }
                {(this.state.pageLoad || this.state.reLogin) && <Loader active inline='centered' />}
            </Layout>
        )
    }
}

export default withRouter(Show);