/* eslint-disable no-param-reassign */
/* eslint-disable prefer-destructuring */
const { raiseEvent, DomainEvent } = require('./DomainEvent');
const { PaginationQueryOptions } = require('./helper');
const { Repository } = require('./Repository');

const Capture = ({
  id,
  reference_id,
  tree_id,
  image_url,
  lat,
  lon,
  estimated_geometric_location,
  gps_accuracy,
  grower_photo_url,
  grower_username,
  morphology,
  age,
  note,
  attributes,
  domain_specific_data,
  created_at,
  updated_at,
  estimated_geographic_location,
  device_configuration_id,
  session_id,
  status,
  grower_id,
  planting_organization_id,
  species_id,
  captured_at,
}) =>
  Object.freeze({
    id,
    reference_id,
    tree_id,
    image_url,
    lat,
    lon,
    estimated_geometric_location,
    gps_accuracy,
    grower_photo_url,
    grower_username,
    morphology,
    age,
    note,
    attributes,
    domain_specific_data,
    created_at,
    updated_at,
    estimated_geographic_location,
    device_configuration_id,
    session_id,
    status,
    grower_id,
    planting_organization_id,
    species_id,
    captured_at,
  });

const captureInsertObject = ({
  id,
  reference_id = null,
  tree_id = null,
  image_url,
  lat,
  lon,
  gps_accuracy,
  grower_photo_url,
  grower_username,
  species_id = null,
  morphology = null,
  age = null,
  note = null,
  attributes,
  domain_specific_data = null,
  device_configuration_id,
  session_id,
  grower_id,
  planting_organization_id,
  captured_at,
}) =>
  Object.freeze({
    id,
    reference_id,
    tree_id,
    image_url,
    lat,
    lon,
    gps_accuracy,
    grower_photo_url,
    grower_username,
    species_id,
    morphology,
    age,
    note,
    domain_specific_data,
    device_configuration_id,
    session_id,
    grower_id,
    planting_organization_id,
    point: `POINT( ${lon} ${lat} )`,
    status: 'active',
    attributes: attributes ? { entries: attributes } : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    captured_at,
  });

const CaptureCreated = ({
  id,
  lat,
  lon,
  grower_id,
  grower_username,
  attributes,
  captured_at,
}) =>
  Object.freeze({
    id,
    type: 'CaptureCreated',
    lat,
    lon,
    grower_id,
    grower_username,
    attributes,
    captured_at,
  });

const createCapture = (captureRepositoryImpl, eventRepositoryImpl) => async (
  inputCapture,
) => {
  const captureRepository = new Repository(captureRepositoryImpl);
  await captureRepository.add(inputCapture);
  const captureCreated = CaptureCreated({
    ...inputCapture,
  });

  const raiseCaptureEvent = raiseEvent(eventRepositoryImpl);
  const domainEvent = await raiseCaptureEvent(DomainEvent(captureCreated));
  return { raisedEvents: { domainEvent } };
};

const FilterCriteria = ({
  tree_id = undefined,
  tree_associated = undefined,
  organization_id = undefined,
  captured_at_start_date = undefined,
  captured_at_end_date = undefined,
}) => {
  const parameters = Object.entries({
    tree_id,
    planting_organization_id: organization_id,
    captured_at_start_date,
    captured_at_end_date,
  })
    .filter((entry) => entry[1] !== undefined)
    .reduce((result, item) => {
      result[item[0]] = item[1];
      return result;
    }, {});

  const whereNulls = [];
  const whereNotNulls = [];

  if (tree_associated === 'true') {
    whereNotNulls.push('tree_id');
  } else if (tree_associated === 'false') {
    whereNulls.push('tree_id');
  }
  return { parameters, whereNulls, whereNotNulls };
};

const getCaptures = (captureRepositoryImpl) => async (
  filterCriteria = undefined,
) => {
  let filter = {};
  let options = { limit: 100, offset: 0 };
  if (filterCriteria !== undefined) {
    filter = FilterCriteria({ ...filterCriteria });
    options = {
      ...options,
      ...PaginationQueryOptions({ ...filterCriteria }),
    };
  }
  // console.log('CAPTURE MODEL getCaptures', filterCriteria, filter, options);
  const captureRepository = new Repository(captureRepositoryImpl);
  const { captures, count } = await captureRepository.getByFilter(
    filter,
    options,
  );

  return {
    captures: captures.map((row) => {
      return Capture({ ...row });
    }),
    count,
  };
};

const applyVerification = (captureRepositoryImpl) => async (
  verifyCaptureProcessed,
) => {
  if (verifyCaptureProcessed.approved) {
    await captureRepositoryImpl.update({
      id: verifyCaptureProcessed.id,
      status: 'approved',
    });
  } else {
    await captureRepositoryImpl.update({
      id: verifyCaptureProcessed.id,
      status: 'rejected',
      rejection_reason: verifyCaptureProcessed.rejection_reason,
    });
  }
};

module.exports = {
  captureInsertObject,
  createCapture,
  getCaptures,
  applyVerification,
  Capture,
};
