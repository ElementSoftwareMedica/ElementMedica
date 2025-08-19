import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
  },
  courseInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  label: {
    width: 100,
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  col1: {
    width: '40%',
  },
  col2: {
    width: '30%',
  },
  col3: {
    width: '30%',
  },
});

interface ParticipantsPDFProps {
  event: any;
}

const ParticipantsPDF: React.FC<ParticipantsPDFProps> = ({ event }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text>Course Participants List</Text>
      </View>

      <View style={styles.courseInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Course:</Text>
          <Text style={styles.value}>{event.title}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>
            {event.start.toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>
            {event.start.toLocaleTimeString()} - {event.end.toLocaleTimeString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{event.extendedProps.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Trainer:</Text>
          <Text style={styles.value}>{event.extendedProps.trainer}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Participant Name</Text>
          <Text style={styles.col2}>Company</Text>
          <Text style={styles.col3}>Department</Text>
        </View>
        {event.extendedProps.participants.map((participant: any, index: number) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.col1}>
              {participant.firstName} {participant.lastName}
            </Text>
            <Text style={styles.col2}>{participant.company}</Text>
            <Text style={styles.col3}>{participant.department}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default ParticipantsPDF;