import React from 'react';
import { Menu, Container, Image, Dropdown } from 'semantic-ui-react';
import { Link } from 'react-router-dom';

export default props => {
    return (
        <React.Fragment>
            <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.css" />

            <link rel="stylesheet" href="index.css" />
            <Menu style={{ margin: '0', borderRadius: '0' }} inverted>
                <Container>
                    <Menu.Item as={Link} header to="/">
                        <Image src={require('../logoTop.png')} size='small' />
                    </Menu.Item>
                    <Menu.Item as={Link} to="/"
                        name='Home'
                    />
                    {props.account &&
                        <React.Fragment>
                            <Menu.Item position='right'>
                                <Image src={props.image} size="mini" circular />
                            </Menu.Item>
                            <Dropdown style={{ marginLeft: '0' }} item text={props.name}>
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={props.logout}>
                                        Logout
                            </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </React.Fragment>
                    }
                </Container>
            </Menu>

            <Container style={{ marginTop: '2em' }}>
                {props.children}
            </Container >
        </React.Fragment>
    );
}