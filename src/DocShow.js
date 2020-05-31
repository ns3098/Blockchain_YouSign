import React, { Component } from "react";
import factory from "./contracts/DocumentFactory.json";
import DocumentCompiled from "./contracts/Document.json";
import getWeb3 from "./getWeb3";
import Layout from './components/Layout';
import { withRouter, Link } from 'react-router-dom';
import { Document, Page } from 'react-pdf';
import Torus from '@toruslabs/torus-embed';
import { Button, Grid, Header, List, Form, Loader, Message, Container, Segment, Icon } from "semantic-ui-react";

//For PDF preview
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

//IPFS
const ipfsClient = require('ipfs-http-client');
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });

class DocShow extends Component {
    state = {
        web3: null,
        torus: null,
        account: null,
        factoryContract: null,
        documentContract: null,
        allowSign: false,
        didSign: false,
        ipfs: null,
        signers: null,
        items: null,
        newSignerId: null,
        newSignerName: null,
        ownerAdd: null,
        owner: null,
        init: false,
        showUpload: false,
        chosenFile: 'Upload',
        vSuccess: false,
        vFailture: false,
        signLoad: false,
        submitLoad: false,
        addLoad: false
    };

    fileInputRef = React.createRef();

    componentDidMount = async () => {
        const checkTorus = window.sessionStorage.getItem('torusLogged');
        if (checkTorus) {
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

            const documentInstance = new web3.eth.Contract(DocumentCompiled.abi, this.props.match.params.address);

            const account = accounts[0];

            const didSign = await documentInstance.methods.addressToSigned(account).call();

            const ipfs = await documentInstance.methods.ipfs_hash().call();

            //Signers list 
            const signersCount = await documentInstance.methods.getSignersCount().call();

            const signers = await Promise.all(
                Array(parseInt(signersCount)).fill().map((Element, index) => {
                    return documentInstance.methods.signers(index).call();
                })
            );

            const ownerAdd = await documentInstance.methods.owner().call();
            const owner = await documentInstance.methods.addressToString(ownerAdd).call();

            const username = window.sessionStorage.getItem('username');
            const userImage = window.sessionStorage.getItem('userImage');


            this.setState({ web3, account, factoryContract: instance, documentContract: documentInstance, ownerAdd, allowSign: true, didSign, ipfs, signers, owner, init: true, torus, userImage, username });

            this.renderSigners();
        } catch (error) {
            console.error(error);
        }
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

        let hash;

        this.setState({ submitLoad: true });

        for await (const file of ipfs.add(this.state.buffer)) {
            hash = file.path;
        }

        if (hash == this.state.ipfs) {
            this.setState({ vSuccess: true, vFailture: false })
        }
        else {
            this.setState({ vSuccess: false, vFailture: true })
        }

        this.setState({ submitLoad: false })
    }

    signDoc = async () => {

        this.setState({ signLoad: true });

        try {
            await this.state.documentContract.methods.sign().send({ from: this.state.account });
            this.setState({ signLoad: false });
            window.location.reload();
        } catch (err) {
            console.log(err);
        }
        
        this.setState({ signLoad: false })
    }

    logout = async () => {
        await this.state.torus.logout();
        window.sessionStorage.setItem('torusLogged', false);
        this.props.history.push('/');
        window.location.reload();
    }

    renderSigners = async () => {

        const items_promise = this.state.signers.map(async address => {
            let hasSigned = await this.state.documentContract.methods.addressToSigned(address).call();
            let name = await this.state.documentContract.methods.addressToString(address).call();

            if (!hasSigned) {
                return (<List.Item>
                    <List.Content><Header textAlign="center" as="h4">
                        {name} <Icon.Group size="medium"><Icon color="grey" name="wait" /></Icon.Group></Header>
                    </List.Content>
                </List.Item>)
            }
            else {
                return (<List.Item>
                    <List.Content><Header textAlign="center" as="h4">
                        {name} <Icon.Group size="medium"><Icon color="green" name="check circle" /></Icon.Group></Header>
                    </List.Content>
                </List.Item>)
            }
        })

        const items = await Promise.all(items_promise);

        this.setState({ items });
    }

    addSigner = async (event) => {

        event.preventDefault();

        this.setState({ addLoad: true });

        const torus = new Torus();
        const publicAddress = await torus.getPublicAddress({
            verifier: "google",
            verifierId: this.state.newSignerId
        }
        );

        try {
            await this.state.factoryContract.methods.giveDocumentAccess(this.state.newSignerName, publicAddress, this.state.documentContract.options.address).send({ from: this.state.account });

            this.setState({ addLoad: false });

            window.location.reload();
        } catch (err) {
            console.log(err);
        }

        this.setState({ addLoad: false });
    }

    render() {
        return (
            <Layout name={this.state.username} image={this.state.userImage} logout={this.logout} account={this.state.account}>
                {this.state.init &&
                    <Segment basic textAlign="center">
                        <Header as="h1"><Icon name="edit outline" />Document</Header>
                    </Segment>
                }
                {this.state.init &&
                    <Grid>
                        <Grid.Column width={6}>
                            <Grid>
                                <Grid.Row style={{ marginTop: '2em', textAlign: 'center', padding: '2' }} columns={2}>
                                    <Grid.Column>
                                        {this.state.ipfs != null && <Button disabled={this.state.didSign} loading={this.state.signLoad} onClick={this.signDoc} color="red" content="Sign Document" icon="signup" />}
                                    </Grid.Column>
                                    <Grid.Column>
                                        {!this.state.showUpload && <Button content="Verify Document" icon="check" secondary onClick={() => this.setState({ showUpload: true })} />}

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
                                <Grid.Row style={{ padding: '0.7em' }}>
                                    <Container>
                                        <Message style={{ margin: '0' }} hidden={!this.state.signLoad} icon>
                                            <Icon name='circle notched' color="red" loading />
                                            <Message.Content>
                                                <Message.Header>Signing Document</Message.Header>
                                                Do not refresh the page!
                                                    </Message.Content>
                                        </Message>
                                        <Message
                                            fluid
                                            hidden={!this.state.vFailture}
                                            negative
                                            header='Documents do not match'
                                            content='Hash values of the document did not match.' />
                                        <Message
                                            hidden={!this.state.vSuccess}
                                            success
                                            header='Documents match'
                                            content={'Hash: ' + this.state.ipfs} />
                                    </Container>
                                </Grid.Row>
                                <hr style={{ width: "100%" }} />
                                {(this.state.ownerAdd == this.state.account && this.state.owner != null) &&
                                    <Grid.Row>
                                        <Grid.Column>
                                            <Header as="h3" textAlign="center">New Signer</Header>
                                            <Form onSubmit={this.addSigner}>
                                                <Form.Field>
                                                    <Form.Input value={this.state.newSignerName} fluid required label="Signer Name" placeholder="Enter signers full name"
                                                        onChange={event => { this.setState({ newSignerName: event.target.value }) }} />
                                                </Form.Field>
                                                <Form.Field>
                                                    <Form.Input value={this.state.newSignerId} fluid required label="Signer Id" placeholder="Enter signers Gmail id"
                                                        onChange={event => { this.setState({ newSignerId: event.target.value }) }} />
                                                </Form.Field>
                                                <Form.Field>
                                                    {!this.state.addLoad && <Button loading={this.state.addLoad} secondary fluid>Add Signer</Button>}
                                                </Form.Field>
                                                <Message hidden={!this.state.addLoad} icon>
                                                    <Icon name='circle notched' loading />
                                                    <Message.Content>
                                                        <Message.Header>Adding New Signer</Message.Header>
                                                        Do not refresh the page!
                                                    </Message.Content>
                                                </Message>
                                            </Form>
                                        </Grid.Column>
                                    </Grid.Row>
                                    }
                            </Grid>
                            {this.state.ownerAdd == this.state.account && <hr/>}
                            <Grid.Row style={{ textAlign: 'center', marginTop: '1.4em' }}>
                                <Header as='h3' textAlign="center">Owned by:</Header>
                                <Header as='h4' style={{ margin: '0' }}>{this.state.owner}</Header>
                            </Grid.Row>
                            <Grid.Row style={{ marginTop: '1.4em' }}>
                                <Header as='h3' textAlign="center">Signers:</Header>
                                <List items={this.state.items} />
                            </Grid.Row>
                        </Grid.Column>
                        <Grid.Column width={10}>
                            {this.state.ipfs && <Document file={"https://ipfs.io/ipfs/" + this.state.ipfs}>
                                <Page pageNumber={1} />
                                <a href={"https://ipfs.io/ipfs/" + this.state.ipfs}>
                                    <Button secondary style={{ margin: '1em' }}>View</Button>
                                </a>
                            </Document>}
                        </Grid.Column>
                    </Grid>}
                {!this.state.init && <Loader active inline='centered' />}
            </Layout>
        )
    }
}

export default withRouter(DocShow);