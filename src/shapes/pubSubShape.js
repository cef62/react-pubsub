import { PropTypes } from 'react';
const { shape, func } = PropTypes;

const pubSubShape = shape({
  register: func.isRequired,
  unregister: func.isRequired,
});

export default pubSubShape;
