import React, { useState, useCallback } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';

import {
  Page,
  LayoutSingleColumn,
  PaginationLinks,
  AvatarMedium,
  Modal,
} from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import {
  fetchDashboard,
  fetchStudentTransactions,
  clearStudentTransactions,
} from './EducationDashboardPage.duck';

import css from './EducationDashboardPage.module.css';

const EducationDashboardPageComponent = props => {
  const {
    scrollingDisabled,
    currentUser,
    stats,
    students,
    institutionName,
    institutionDomain,
    pagination,
    fetchInProgress,
    fetchError,
    selectedStudent,
    studentTransactions,
    studentTransactionsInProgress,
    onFetchDashboard,
    onFetchStudentTransactions,
    onClearStudentTransactions,
    onManageDisableScrolling,
  } = props;

  const intl = useIntl();
  const history = useHistory();
  const location = useLocation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Access check: only educational admins can access this page
  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const isEducationalAdmin = publicData?.userType === 'educational-admin';

  const handleViewStudent = useCallback(
    student => {
      onFetchStudentTransactions(student.id, {});
      setIsModalOpen(true);
    },
    [onFetchStudentTransactions]
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    onClearStudentTransactions();
  }, [onClearStudentTransactions]);

  const handlePageChange = page => {
    const params = new URLSearchParams(location.search);
    params.set('page', page);
    history.push({ pathname: '/education/dashboard', search: params.toString() });
    onFetchDashboard({ page });
  };

  const title = intl.formatMessage({ id: 'EducationDashboardPage.title' });

  // Access control
  if (currentUser && !isEducationalAdmin) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn
          topbar={<TopbarContainer />}
          footer={<FooterContainer />}
        >
          <div className={css.noAccess}>
            <h1><FormattedMessage id="EducationDashboardPage.noAccessTitle" /></h1>
            <p><FormattedMessage id="EducationDashboardPage.noAccessMessage" /></p>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  // Filter students by search term
  const filteredStudents = searchTerm
    ? students.filter(s => {
        const displayName = s.attributes.profile.displayName?.toLowerCase() || '';
        const major = s.attributes.profile.publicData?.major?.toLowerCase() || '';
        const university = s.attributes.profile.publicData?.university?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        return displayName.includes(term) || major.includes(term) || university.includes(term);
      })
    : students;

  const getStatusClass = status => {
    switch (status) {
      case 'applied':
        return css.statusApplied;
      case 'accepted':
        return css.statusAccepted;
      case 'declined':
        return css.statusDeclined;
      case 'completed':
        return css.statusCompleted;
      case 'reviewed':
        return css.statusReviewed;
      default:
        return '';
    }
  };

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
        <div className={css.pageContent}>
          <h1 className={css.pageHeading}>
            <FormattedMessage id="EducationDashboardPage.heading" />
          </h1>

          {institutionName && (
            <p className={css.institutionInfo}>
              <FormattedMessage
                id="EducationDashboardPage.institutionInfo"
                values={{
                  institution: institutionName,
                  domain: <span className={css.institutionDomain}>@{institutionDomain}</span>,
                }}
              />
            </p>
          )}

          {/* Loading State */}
          {fetchInProgress && (
            <div className={css.loading}>
              <FormattedMessage id="EducationDashboardPage.loading" />
            </div>
          )}

          {/* Error State */}
          {fetchError && (
            <div className={css.error}>
              <FormattedMessage id="EducationDashboardPage.fetchError" />
            </div>
          )}

          {/* Stats Section */}
          {!fetchInProgress && stats && (
            <div className={css.statsSection}>
              <h2 className={css.statsSectionTitle}>
                <FormattedMessage id="EducationDashboardPage.statsTitle" />
              </h2>
              <div className={css.statsGrid}>
                <div className={css.statCard}>
                  <div className={css.statValue}>{stats.totalStudents}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statStudents" />
                  </div>
                </div>
                <div className={css.statCard}>
                  <div className={css.statValue}>{stats.projectsApplied}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statApplied" />
                  </div>
                </div>
                <div className={css.statCard}>
                  <div className={css.statValue}>{stats.projectsAccepted || 0}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statAccepted" />
                  </div>
                </div>
                <div className={css.statCard}>
                  <div className={css.statValue}>{stats.projectsDeclined}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statDeclined" />
                  </div>
                </div>
                <div className={css.statCard}>
                  <div className={css.statValue}>{stats.projectsCompleted}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statCompleted" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Students Section */}
          {!fetchInProgress && (
            <div className={css.studentsSection}>
              <div className={css.sectionHeader}>
                <h2 className={css.sectionTitle}>
                  <FormattedMessage id="EducationDashboardPage.studentsTitle" />
                </h2>
                <input
                  type="text"
                  className={css.searchInput}
                  placeholder={intl.formatMessage({ id: 'EducationDashboardPage.searchPlaceholder' })}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {filteredStudents.length === 0 ? (
                <div className={css.noResults}>
                  <FormattedMessage id="EducationDashboardPage.noStudents" />
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className={css.desktopTable}>
                    <table className={css.studentsTable}>
                      <thead>
                        <tr>
                          <th><FormattedMessage id="EducationDashboardPage.tableStudent" /></th>
                          <th><FormattedMessage id="EducationDashboardPage.tableMajor" /></th>
                          <th><FormattedMessage id="EducationDashboardPage.tableGradYear" /></th>
                          <th><FormattedMessage id="EducationDashboardPage.tableActions" /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(student => {
                          const studentPublicData = student.attributes.profile.publicData || {};
                          return (
                            <tr key={student.id} className={css.studentRow}>
                              <td>
                                <div className={css.studentInfo}>
                                  <AvatarMedium
                                    user={{
                                      id: { uuid: student.id },
                                      type: 'user',
                                      attributes: student.attributes,
                                      profileImage: student.profileImage
                                        ? {
                                            id: { uuid: student.profileImage.id },
                                            type: 'image',
                                            attributes: student.profileImage.attributes,
                                          }
                                        : null,
                                    }}
                                  />
                                  <span className={css.studentName}>
                                    {student.attributes.profile.displayName}
                                  </span>
                                </div>
                              </td>
                              <td className={css.studentMeta}>
                                {studentPublicData.major || '-'}
                              </td>
                              <td className={css.studentMeta}>
                                {studentPublicData.graduationYear || '-'}
                              </td>
                              <td>
                                <button
                                  className={css.viewButton}
                                  onClick={() => handleViewStudent(student)}
                                >
                                  <FormattedMessage id="EducationDashboardPage.viewDetails" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className={css.studentsCards}>
                    {filteredStudents.map(student => {
                      const studentPublicData = student.attributes.profile.publicData || {};
                      return (
                        <div key={student.id} className={css.studentCard}>
                          <div className={css.studentCardHeader}>
                            <div>
                              <div className={css.studentCardName}>
                                {student.attributes.profile.displayName}
                              </div>
                            </div>
                            <button
                              className={css.viewButton}
                              onClick={() => handleViewStudent(student)}
                            >
                              <FormattedMessage id="EducationDashboardPage.viewDetails" />
                            </button>
                          </div>
                          <div className={css.studentCardDetails}>
                            <div>{studentPublicData.major || 'No major'}</div>
                            <div>Class of {studentPublicData.graduationYear || '-'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <PaginationLinks
                      className={css.pagination}
                      pageName="EducationDashboardPage"
                      pageSearchParams={{}}
                      pagination={{
                        ...pagination,
                        paginationUnsupported: false,
                      }}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Student Transactions Modal */}
        <Modal
          id="StudentTransactionsModal"
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onManageDisableScrolling={onManageDisableScrolling}
          usePortal
        >
          <div className={css.modalContent}>
            <div className={css.modalHeader}>
              <div>
                <h3 className={css.modalTitle}>
                  {selectedStudent?.displayName || 'Student'} - Activity
                </h3>
                <p className={css.modalStudentInfo}>
                  {selectedStudent?.major && `${selectedStudent.major} • `}
                  Class of {selectedStudent?.graduationYear || '-'}
                </p>
              </div>
              <button className={css.closeButton} onClick={handleCloseModal}>
                ×
              </button>
            </div>

            {studentTransactionsInProgress ? (
              <div className={css.loading}>
                <FormattedMessage id="EducationDashboardPage.loadingTransactions" />
              </div>
            ) : studentTransactions.length === 0 ? (
              <div className={css.noTransactions}>
                <FormattedMessage id="EducationDashboardPage.noTransactions" />
              </div>
            ) : (
              <div className={css.transactionsList}>
                {studentTransactions.map(tx => (
                  <div key={tx.id} className={css.transactionItem}>
                    <div>
                      <div className={css.transactionProject}>
                        {tx.listing?.title || 'Unknown Project'}
                      </div>
                      <div className={css.transactionCompany}>
                        {tx.provider?.companyName || tx.provider?.displayName || 'Unknown Company'}
                      </div>
                      <div className={css.transactionDate}>
                        {new Date(tx.attributes.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`${css.transactionStatus} ${getStatusClass(tx.attributes.state)}`}>
                      {tx.attributes.state}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    stats,
    students,
    institutionName,
    institutionDomain,
    pagination,
    fetchInProgress,
    fetchError,
    selectedStudent,
    studentTransactions,
    studentTransactionsInProgress,
  } = state.EducationDashboardPage;

  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    stats,
    students,
    institutionName,
    institutionDomain,
    pagination,
    fetchInProgress,
    fetchError,
    selectedStudent,
    studentTransactions,
    studentTransactionsInProgress,
  };
};

const mapDispatchToProps = dispatch => ({
  onFetchDashboard: params => dispatch(fetchDashboard(params)),
  onFetchStudentTransactions: (studentId, params) =>
    dispatch(fetchStudentTransactions(studentId, params)),
  onClearStudentTransactions: () => dispatch(clearStudentTransactions()),
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
});

const EducationDashboardPage = compose(
  connect(mapStateToProps, mapDispatchToProps)
)(EducationDashboardPageComponent);

export default EducationDashboardPage;
