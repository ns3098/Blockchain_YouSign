import React, { Component } from 'react';
import DocumentFactory from "./contracts/DocumentFactory.json";
import getWeb3 from "./getWeb3";
import Layout from './components/Layout';
import { withRouter, Link } from 'react-router-dom';
import { Document, Page } from 'react-pdf';
import { Form, Button, Grid, Message, Icon, Header, Segment } from 'semantic-ui-react';

import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

class New extends Component {
    state = { web3: null, account: null, contract: null, ipfs: null, name: null, description: null, loading: false, torus: null };

    componentDidMount = async () => {

        this.setState({ ipfs: this.props.location.state.ipfs });

        try {
            // Get network provider and web3 instance.
            const web3Obj = await getWeb3();
            const web3 = web3Obj.web3;
            const torus = web3Obj.torus;

            // Use web3 to get the user's accounts.
            let accounts = await web3.eth.getAccounts();

            console.log(accounts[0]);

            // Get the contract instance.
            const networkId = await web3.eth.net.getId();
            const deployedNetwork = DocumentFactory.networks[networkId];
            const instance = new web3.eth.Contract(
                DocumentFactory.abi,
                deployedNetwork && deployedNetwork.address,
            );

            const account = accounts[0];

            const username = window.sessionStorage.getItem('username');
            const userImage = window.sessionStorage.getItem('userImage');

            this.setState({ web3, account, contract: instance, username, userImage, torus });
        } catch (error) {
            alert(
                `Failed to load web3, accounts, or contract. Check console for details.`,
            );
            console.error(error);
        }
    };

    logout = async () => {
        await this.state.torus.logout();
        window.sessionStorage.setItem('torusLogged', false);
        this.props.history.push('/');
        window.location.reload();
    }

    onSubmit = async (event) => {

        event.preventDefault();

        this.setState({ loading: true });

        try {
            console.log("Creation started!");
            await this.state.contract.methods.createDocument(this.state.ipfs, this.state.name, this.state.description, this.state.username)
                .send({ from: this.state.account });

            const documents = await this.state.contract.methods.getDocuments(this.state.account).call();
            documents.reverse();

            console.log(documents[0]);
            this.props.history.push('/' + documents[0]);

        } catch (err) {
            console.log(err);
        }

        this.setState({ loading: false })
    }

    render() {
        return (
            <Layout name={this.state.username} image={this.state.userImage} logout={this.logout} account={this.state.account}>
                <Segment style={{ margin: '2em' }} basic textAlign="center">
                    <Header as="h1"><Icon name="file alternate outline" />New Document</Header>
                    <p>Give the document a name and a brief description.</p>
                </Segment>
                <Grid>
                    <Grid.Column width={10}>
                        <Document file={"https://ipfs.io/ipfs/" + this.props.location.state.ipfs}>
                            <Page pageNumber={1} />
                            <a href={"https://ipfs.io/ipfs/" + this.props.location.state.ipfs}>
                                <Button secondary style={{ margin: '1em' }}>View</Button>
                            </a>
                        </Document>
                    </Grid.Column>
                    <Grid.Column width={6}>
                        <Form onSubmit={this.onSubmit}>
                            <Form.Field>
                                <Form.Input value={this.state.name} fluid required label="Document Name" placeholder="Enter the name of the document"
                                    onChange={event => { this.setState({ name: event.target.value }) }} />
                            </Form.Field>
                            <Form.Field>
                                <Form.TextArea value={this.state.description} label="Document Description" placeholder="Give a brief description of the document" onChange={event => { this.setState({ description: event.target.value }) }} />
                            </Form.Field>
                            {!this.state.loading && <Button secondary>Submit</Button>}
                        </Form>
                        <Message hidden={!this.state.loading} icon>
                            <Icon name='circle notched' loading />
                            <Message.Content>
                                <Message.Header>Creating New Document</Message.Header>
                                Do not refresh the page!
                             </Message.Content>
                        </Message>
                    </Grid.Column>
                </Grid>
            </Layout>
        );
    }
}

export default withRouter(New);